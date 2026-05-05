const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { auth, adminOnly } = require('../middleware/auth');

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, description, startDate, deadline, priority } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    const project = new Project({
      name,
      description: description || '',
      admin: req.user.id,
      members: [req.user.id],
      startDate: startDate || null,
      deadline: deadline || null,
      priority: priority || 'medium',
      status: 'planning',
    });

    await project.save();
    console.log('Project created:', name);

    await Activity.create({
      type: 'project_created',
      projectId: project._id,
      userId: req.user.id,
      message: `created project "${name}"`,
    });

    const populated = await Project.findById(project._id)
      .populate('admin', 'name email')
      .populate('members', 'name email');

    res.status(201).json(populated);
  } catch (err) {
    console.log('Create project error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { admin: req.user.id },
        { members: req.user.id },
      ],
    }).populate('admin', 'name email')
      .populate('members', 'name email')
      .sort({ createdAt: -1 });

    const projectsWithProgress = await Promise.all(
      projects.map(async (project) => {
        const totalTasks = await Task.countDocuments({ projectId: project._id });
        const completedTasks = await Task.countDocuments({ projectId: project._id, status: 'done' });
        return {
          ...project.toObject(),
          totalTasks,
          completedTasks,
          progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        };
      })
    );

    res.json(projectsWithProgress);
  } catch (err) {
    console.log('Get projects error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('admin', 'name email')
      .populate('members', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const tasks = await Task.find({ projectId: project._id })
      .populate('assignedTo', 'name email')
      .populate('completedBy', 'name email');

    const activities = await Activity.find({ projectId: project._id })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(20);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;

    const result = {
      ...project.toObject(),
      tasks,
      activities,
      totalTasks,
      completedTasks,
      progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };

    res.json(result);
  } catch (err) {
    console.log('Get project error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, description, startDate, deadline, priority, status } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (startDate !== undefined) project.startDate = startDate;
    if (deadline !== undefined) project.deadline = deadline;
    if (priority) project.priority = priority;
    if (status) project.status = status;

    await project.save();

    const updated = await Project.findById(req.params.id)
      .populate('admin', 'name email')
      .populate('members', 'name email');

    const totalTasks = await Task.countDocuments({ projectId: project._id });
    const completedTasks = await Task.countDocuments({ projectId: project._id, status: 'done' });

    res.json({
      ...updated.toObject(),
      totalTasks,
      completedTasks,
      progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    });
  } catch (err) {
    console.log('Update project error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/add-member', auth, adminOnly, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.members.includes(user._id)) {
      return res.status(400).json({ message: 'User is already a member' });
    }

    project.members.push(user._id);
    await project.save();

    await Activity.create({
      type: 'member_added',
      projectId: project._id,
      userId: req.user.id,
      message: `added ${user.name} to the project`,
    });

    const updatedProject = await Project.findById(req.params.id)
      .populate('admin', 'name email')
      .populate('members', 'name email');

    console.log('Member added:', email);
    res.json(updatedProject);
  } catch (err) {
    console.log('Add member error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/remove-member', auth, adminOnly, async (req, res) => {
  try {
    const { userId } = req.body;

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (userId === project.admin.toString()) {
      return res.status(400).json({ message: 'Cannot remove the project admin' });
    }

    project.members = project.members.filter(
      (member) => member.toString() !== userId
    );
    await project.save();

    await Activity.create({
      type: 'member_removed',
      projectId: project._id,
      userId: req.user.id,
      message: `removed a member from the project`,
    });

    const updatedProject = await Project.findById(req.params.id)
      .populate('admin', 'name email')
      .populate('members', 'name email');

    console.log('Member removed');
    res.json(updatedProject);
  } catch (err) {
    console.log('Remove member error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the project admin can delete this project' });
    }

    await Task.deleteMany({ projectId: project._id });
    await Activity.deleteMany({ projectId: project._id });
    await Project.findByIdAndDelete(req.params.id);

    console.log('Project deleted:', project.name);
    res.json({ message: 'Project and all associated data deleted' });
  } catch (err) {
    console.log('Delete project error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
