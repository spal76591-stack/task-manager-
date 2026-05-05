import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import './ProjectDetail.css';

function ProjectDetail() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDueDate, setTaskDueDate] = useState('');

  const [memberEmail, setMemberEmail] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data);
      setStatus(res.data.status || 'active');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/projects/${id}`, { status });
      fetchProject();
    } catch (err) {
      console.error(err);
      alert('Error updating status');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tasks', {
        title: taskTitle,
        description: taskDesc,
        projectId: id,
        assignedTo: taskAssignee || null,
        priority: taskPriority,
        dueDate: taskDueDate || null,
      });
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssignee('');
      setTaskPriority('medium');
      setTaskDueDate('');
      fetchProject();
    } catch (err) {
      console.error(err);
      alert('Error adding task');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/projects/${id}/add-member`, { email: memberEmail });
      setMemberEmail('');
      fetchProject();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error adding member');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await api.post(`/projects/${id}/remove-member`, { userId: memberId });
      fetchProject();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error removing member');
    }
  };

  const handleMarkDone = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'done' ? 'todo' : 'done';
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      fetchProject();
    } catch(err) {
      console.error(err);
      alert('Error updating task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      fetchProject();
    } catch(err) {
      console.error(err);
      alert('Error deleting task');
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Are you sure? This deletes the project and all its tasks. This cannot be undone.')) return;
    try {
      await api.delete(`/projects/${id}`);
      navigate('/projects');
    } catch(err) {
      console.error(err);
      alert('Error deleting project');
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() ;
  };

  if (loading) return <div className="loading">Loading project...</div>;
  if (!project) return <div className="error-msg">Project not found</div>;

  return (
    <div className="project-detail-container">
      <div className="pd-header">
        <h1>{project.name}</h1>
        <p>{project.description}</p>

        <div className="pd-meta">
          <span className={`badge badge-status-${project.status || 'active'}`}>
            {project.status ? project.status.replace('_', ' ').replace('-', ' ') : 'Active'}
          </span>
          <span className={`badge badge-priority-${project.priority || 'medium'}`}>
            {project.priority || 'Medium'}
          </span>
          <span className="badge">{project.progress || 0}% Complete</span>
          <span className="badge">{project.totalTasks || 0} Tasks</span>
        </div>
      </div>

      <div className="pd-content">
        <div className="pd-main">
          {user.role === 'admin' && (
            <div className="pd-section">
              <h2>⚙️ Project Settings</h2>
              <form onSubmit={handleUpdateStatus} className="inline-form">
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 24px' }}>Update</button>
              </form>
              <button className="btn-delete-project" onClick={handleDeleteProject} style={{ marginTop: '16px', width: '100%', background: 'transparent', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '10px' }}>
                🗑️ Delete Project
              </button>
            </div>
          )}

          <div className="pd-section">
            <h2>📋 Tasks ({project.tasks ? project.tasks.length : 0})</h2>

            {user.role === 'admin' && (
              <div className="add-task-form">
                <h3>Add New Task</h3>
                <form onSubmit={handleAddTask}>
                  <div className="form-group">
                    <input type="text" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} required placeholder="Task title" />
                  </div>
                  <div className="form-group">
                    <input type="text" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Description (optional)" />
                  </div>
                  <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <select value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)}>
                      <option value="">Assign to...</option>
                      {project.members && project.members.map(m => (
                        <option key={m._id} value={m._id}>{m.name}</option>
                      ))}
                    </select>
                    <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)}>
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Due Date</label>
                    <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} />
                  </div>
                  <button type="submit" className="btn-primary">Add Task</button>
                </form>
              </div>
            )}

            <div className="task-list">
              {project.tasks && project.tasks.length > 0 ? project.tasks.map(task => {
                const isAssignedToMe = task.assignedTo && task.assignedTo._id === user.userId;
                const isCompleted = task.status === 'done';
                const taskOverdue = !isCompleted && isOverdue(task.dueDate);

                return (
                  <div key={task._id} className={`task-item ${isCompleted ? 'task-completed' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ textDecoration: isCompleted ? 'line-through' : 'none' }}>{task.title}</h4>
                        {task.description && <p>{task.description}</p>}
                        {task.dueDate && (
                          <div className={`due-date-display ${taskOverdue ? 'overdue-text' : ''}`}>
                            {taskOverdue ? '⚠️ Overdue: ' : '📅 Due: '}{new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '12px' }}>
                        <span className={`badge badge-priority-${task.priority}`}>{task.priority}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                        {task.assignedTo ? `👤 ${task.assignedTo.name}` : '— Unassigned'}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {(user.role === 'admin' || isAssignedToMe) && (
                          <button className="btn-mark-done" onClick={() => handleMarkDone(task._id, task.status)}>
                            {isCompleted ? '↩ Reopen' : '✓ Done'}
                          </button>
                        )}
                        {user.role === 'admin' && (
                          <button className="btn-mark-done" onClick={() => handleDeleteTask(task._id)} style={{ color: 'var(--accent-red)' }}>
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  No tasks yet.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pd-sidebar">
          <div className="pd-section">
            <h2>👥 Members ({project.members ? project.members.length : 0})</h2>
            {user.role === 'admin' && (
              <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                <input type="email" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} required placeholder="Add by email..." style={{ flex: 1 }} />
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 16px', fontSize: '1.1rem' }}>+</button>
              </form>
            )}
            <div>
              {project.members && project.members.map(m => (
                <div key={m._id} className="member-item">
                  <div className="member-avatar">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong>{m.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.email}</div>
                  </div>
                  {user.role === 'admin' && project.admin && m._id !== (project.admin._id || project.admin) && (
                    <button onClick={() => handleRemoveMember(m._id)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', fontSize: '0.8rem', padding: '4px 8px', cursor: 'pointer' }}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pd-section">
            <h2>📝 Activity Log</h2>
            <div>
              {project.activities && project.activities.length > 0 ? project.activities.map(act => (
                <div key={act._id} className="activity-log-item">
                  <strong>{act.userId ? act.userId.name : 'System'}</strong>{' '}
                  {act.message}
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {new Date(act.createdAt).toLocaleString()}
                  </div>
                </div>
              )) : (
                <div className="empty-state" style={{ padding: '24px' }}>No activity yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectDetail;
