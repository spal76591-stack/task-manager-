import { useState, useEffect, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import './Dashboard.css';

function Dashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/tasks/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!stats) return <div className="error-msg">Failed to load dashboard data</div>;

  const getActivityIcon = (type) => {
    switch(type) {
      case 'project_created': return <span className="activity-icon">📁</span>;
      case 'task_created': return <span className="activity-icon">✦</span>;
      case 'task_status_changed': return <span className="activity-icon">⟳</span>;
      case 'task_completed': return <span className="activity-icon" style={{ background: 'var(--accent-green-soft)', color: 'var(--accent-green)' }}>✓</span>;
      case 'member_added': return <span className="activity-icon" style={{ background: 'var(--accent-cyan-soft)', color: 'var(--accent-cyan)' }}>+</span>;
      default: return <span className="activity-icon">•</span>;
    }
  };

  const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Welcome back, <span>{user.name}</span></h1>
        <p>Here's what's happening across your projects.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Projects</h3>
          <div className="stat-value">{stats.totalProjects}</div>
        </div>
        <div className="stat-card">
          <h3>Total Tasks</h3>
          <div className="stat-value">{stats.totalTasks}</div>
        </div>
        <div className="stat-card">
          <h3>Completed</h3>
          <div className="stat-value">{stats.completedTasks}</div>
        </div>
        <div className="stat-card">
          <h3>Completion</h3>
          <div className="stat-value">{completionRate}%</div>
        </div>
        <div className="stat-card">
          <h3>Overdue</h3>
          <div className="stat-value" style={stats.overdueTasks > 0 ? { background: 'linear-gradient(135deg, #ef4444, #f59e0b)', WebkitBackgroundClip: 'text', color: 'transparent' } : {}}>
            {stats.overdueTasks || 0}
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-main">
          <div className="dashboard-section">
            <h2>⚡ Upcoming Tasks</h2>
            {stats.upcomingTasks && stats.upcomingTasks.length > 0 ? (
              <div className="task-list">
                {stats.upcomingTasks.map(task => (
                  <div key={task._id} className="task-item">
                    <h4>{task.title}</h4>
                    <div className="task-meta">
                      <span className="priority-badge">
                        {task.priority || 'Medium'}
                      </span>
                      <span>{task.projectId ? task.projectId.name : 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🎯</div>
                No upcoming tasks — you're all caught up!
              </div>
            )}
          </div>

          <div className="dashboard-section">
            <h2>✅ Recently Completed</h2>
            {stats.recentlyCompleted && stats.recentlyCompleted.length > 0 ? (
              <div className="task-list">
                {stats.recentlyCompleted.map(task => (
                  <div key={task._id} className="task-item">
                    <h4>{task.title}</h4>
                    <div className="task-meta">
                      <span className="status-badge status-completed">Done</span>
                      <span>By: {task.completedBy ? task.completedBy.name : 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                No recently completed tasks.
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-sidebar">
          <div className="dashboard-section">
            <h2>🔔 Team Activity</h2>
            {stats.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="activity-feed">
                {stats.recentActivity.map(activity => (
                  <div key={activity._id} className="activity-item">
                    {getActivityIcon(activity.type)}
                    <div className="activity-content">
                      <div className="activity-text">
                        <strong>{activity.userId ? activity.userId.name : 'System'}</strong>{' '}
                        {activity.message}
                      </div>
                      <div className="activity-time">
                        {new Date(activity.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📡</div>
                No activity recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
