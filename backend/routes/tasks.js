const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const Activity = require('../models/Activity');
const { auth, adminOnly } = require('../middleware/auth');

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { title, description, projectId, assignedTo, dueDate, priority } = req.body;

    if (!title || !projectId) {
      return res.status(400).json({ message: 'Title and project are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const task = new Task({
      title,
      description: description || '',
      projectId,
      assignedTo: assignedTo || null,
      status: 'todo',
      priority: priority || 'medium',
      dueDate: dueDate || null,
    });

    await task.save();
    console.log('Task created:', title);

    await Activity.create({
      type: 'task_created',
      projectId,
      taskId: task._id,
      userId: req.user.id,
      message: `created task "${title}"`,
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('projectId', 'name')
      .populate('completedBy', 'name email');

    res.status(201).json(populatedTask);
  } catch (err) {
    console.log('Create task error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ projectId: req.params.projectId })
      .populate('assignedTo', 'name email')
      .populate('projectId', 'name')
      .populate('completedBy', 'name email')
      .sort({ priority: -1, createdAt: -1 });

    res.json(tasks);
  } catch (err) {
    console.log('Get tasks error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my-tasks', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.id })
      .populate('assignedTo', 'name email')
      .populate('projectId', 'name')
      .populate('completedBy', 'name email')
      .sort({ dueDate: 1, priority: -1 });

    res.json(tasks);
  } catch (err) {
    console.log('Get my tasks error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/dashboard', auth, async (req, res) => {
  try {
    let tasks;
    let projects;

    if (req.user.role === 'admin') {
      projects = await Project.find({ admin: req.user.id });
      const projectIds = projects.map((p) => p._id);
      tasks = await Task.find({ projectId: { $in: projectIds } })
        .populate('assignedTo', 'name email')
        .populate('projectId', 'name')
        .populate('completedBy', 'name email');
    } else {
      tasks = await Task.find({ assignedTo: req.user.id })
        .populate('assignedTo', 'name email')
        .populate('projectId', 'name')
        .populate('completedBy', 'name email');
      projects = await Project.find({ members: req.user.id });
    }

    const now = new Date();
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    const pendingTasks = tasks.filter((t) => t.status !== 'done').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length;
    const overdueTasks = tasks.filter((t) => {
      return t.status !== 'done' && t.dueDate && new Date(t.dueDate) < now;
    }).length;

    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingTasks = tasks.filter((t) => {
      return t.status !== 'done' && t.dueDate &&
        new Date(t.dueDate) >= now && new Date(t.dueDate) <= sevenDaysFromNow;
    });

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentlyCompleted = tasks.filter((t) => {
      return t.status === 'done' && t.completedAt && new Date(t.completedAt) >= sevenDaysAgo;
    });

    let activityQuery;
    if (req.user.role === 'admin') {
      const projectIds = projects.map((p) => p._id);
      activityQuery = { projectId: { $in: projectIds } };
    } else {
      const projectIds = projects.map((p) => p._id);
      activityQuery = { projectId: { $in: projectIds } };
    }

    const recentActivity = await Activity.find(activityQuery)
      .populate('userId', 'name email')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 })
      .limit(15);

    res.json({
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
      totalProjects: projects.length,
      upcomingTasks,
      recentlyCompleted,
      recentActivity,
    });
  } catch (err) {
    console.log('Dashboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { status, title, description, assignedTo, dueDate, priority } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const oldStatus = task.status;

    if (status) task.status = status;
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (assignedTo !== undefined) task.assignedTo = assignedTo;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (priority) task.priority = priority;

    if (status === 'done' && oldStatus !== 'done') {
      task.completedAt = new Date();
      task.completedBy = req.user.id;

      await Activity.create({
        type: 'task_completed',
        projectId: task.projectId,
        taskId: task._id,
        userId: req.user.id,
        message: `completed task "${task.title}"`,
      });
    } else if (status && status !== 'done' && oldStatus === 'done') {
      task.completedAt = null;
      task.completedBy = null;

      await Activity.create({
        type: 'task_status_changed',
        projectId: task.projectId,
        taskId: task._id,
        userId: req.user.id,
        message: `re-opened task "${task.title}" (changed to ${status})`,
      });
    } else if (status && status !== oldStatus) {
      await Activity.create({
        type: 'task_status_changed',
        projectId: task.projectId,
        taskId: task._id,
        userId: req.user.id,
        message: `changed task "${task.title}" status to ${status}`,
      });
    }

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('projectId', 'name')
      .populate('completedBy', 'name email');

    res.json(updatedTask);
  } catch (err) {
    console.log('Update task error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/mark-done', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.assignedTo?.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only mark your own tasks as done' });
    }

    if (task.status === 'done') {
      return res.status(400).json({ message: 'Task is already marked as done' });
    }

    task.status = 'done';
    task.completedAt = new Date();
    task.completedBy = req.user.id;
    await task.save();

    await Activity.create({
      type: 'task_completed',
      projectId: task.projectId,
      taskId: task._id,
      userId: req.user.id,
      message: `completed task "${task.title}"`,
    });

    const updatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('projectId', 'name')
      .populate('completedBy', 'name email');

    res.json(updatedTask);
  } catch (err) {
    console.log('Mark done error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/activity/:projectId', auth, async (req, res) => {
  try {
    const activities = await Activity.find({ projectId: req.params.projectId })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(activities);
  } catch (err) {
    console.log('Activity error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.log('Delete task error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
