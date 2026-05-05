import { useState, useEffect } from 'react';
import api from '../api';
import './MyTasks.css';

function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks/my-tasks');
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDone = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'done' ? 'todo' : 'done';
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      fetchTasks();
    } catch(err) {
      console.error(err);
      alert('Error updating task');
    }
  };

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'done') return false;
    return new Date(dueDate) < new Date();
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'pending') return task.status !== 'done';
    if (filter === 'overdue') return isOverdue(task.dueDate, task.status);
    return task.status === filter;
  });

  if (loading) return <div className="loading">Loading your tasks...</div>;

  const overdueCount = tasks.filter(t => isOverdue(t.dueDate, t.status)).length;
  const pendingCount = tasks.filter(t => t.status !== 'done').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;

  return (
    <div className="mytasks-container">
      <div className="mytasks-header">
        <h1>My Tasks</h1>
        <p>Tasks assigned to you across all projects.</p>
      </div>

      <div className="task-filters">
        <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All ({tasks.length})
        </button>
        <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
          Pending ({pendingCount})
        </button>
        <button className={`filter-btn ${filter === 'done' ? 'active' : ''}`} onClick={() => setFilter('done')}>
          Done ({doneCount})
        </button>
        {overdueCount > 0 && (
          <button className={`filter-btn ${filter === 'overdue' ? 'active' : ''}`} onClick={() => setFilter('overdue')} style={filter === 'overdue' ? { background: 'var(--accent-red-soft)', color: 'var(--accent-red)', borderColor: 'rgba(239,68,68,0.4)' } : { color: 'var(--accent-red)' }}>
            ⚠ Overdue ({overdueCount})
          </button>
        )}
      </div>

      <div className="mytasks-list">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              {filter === 'done' ? '🎉' : filter === 'overdue' ? '✨' : '📭'}
            </div>
            {filter === 'done' ? 'No completed tasks yet.' :
             filter === 'overdue' ? 'No overdue tasks — great job!' :
             'No tasks found.'}
          </div>
        ) : (
          filteredTasks.map(task => {
            const isCompleted = task.status === 'done';
            const taskOverdue = isOverdue(task.dueDate, task.status);
            return (
              <div key={task._id} className={`my-task-card ${isCompleted ? 'completed' : ''}`}>
                <div>
                  <h3 style={{ textDecoration: isCompleted ? 'line-through' : 'none' }}>{task.title}</h3>
                  <p>{task.projectId ? task.projectId.name : 'N/A'}</p>
                  <div className="task-card-meta">
                    <span className={`badge badge-priority-${task.priority || 'medium'}`}>
                      {task.priority || 'Medium'}
                    </span>
                    {isCompleted && (
                      <span className="badge" style={{ background: 'var(--accent-green-soft)', color: 'var(--accent-green)', borderColor: 'rgba(34,197,94,0.25)' }}>
                        ✓ Done
                      </span>
                    )}
                  </div>
                  {task.dueDate && (
                    <div className={`task-due-info ${taskOverdue ? 'overdue' : ''}`}>
                      {taskOverdue ? '⚠️ Overdue: ' : '📅 Due: '}{new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <button className="btn-mark-done" onClick={() => handleMarkDone(task._id, task.status)}>
                  {isCompleted ? '↩ Reopen' : '✓ Done'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default MyTasks;
