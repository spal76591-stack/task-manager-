import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import './Projects.css';

function Projects() {
  const { user } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('medium');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/projects', { name, description, startDate, deadline, priority });
      setProjects([res.data, ...projects]);
      setName('');
      setDescription('');
      setStartDate('');
      setDeadline('');
      setPriority('medium');
    } catch (err) {
      console.error(err);
      alert('Error creating project');
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    try {
      await api.delete(`/projects/${projectId}`);
      setProjects(projects.filter(p => p._id !== projectId));
    } catch (err) {
      console.error(err);
      alert('Error deleting project');
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="loading">Loading projects...</div>;

  return (
    <div className="projects-container">
      <div className="projects-header">
        <h1>Projects</h1>
        <div className="projects-search">
          <input
            type="text"
            placeholder="🔍  Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="on-hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {user.role === 'admin' && (
        <div className="create-project-card">
          <h2>✨ Create New Project</h2>
          <form onSubmit={handleCreate}>
            <div className="form-group form-group-full">
              <label>Project Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Enter project name" />
            </div>
            <div className="form-group form-group-full">
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Describe your project..."
                style={{ width: '100%', padding: '14px 16px', minHeight: '100px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', resize: 'vertical' }}
              />
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Deadline</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div className="form-group form-group-full">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" style={{ gridColumn: '1 / -1' }}>Create Project</button>
          </form>
        </div>
      )}

      <div className="projects-grid">
        {filteredProjects.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-state-icon">📁</div>
            {searchQuery || filterStatus !== 'all'
              ? 'No projects match your filters.'
              : 'No projects yet. Create your first one!'}
          </div>
        ) : (
          filteredProjects.map(project => (
            <div key={project._id} className="project-card">
              <div className="project-header">
                <h3>{project.name}</h3>
                <p>{project.description}</p>
              </div>

              <div className="project-badges">
                <span className={`badge badge-status-${project.status || 'active'}`}>
                  {project.status ? project.status.replace('_', ' ').replace('-', ' ') : 'Active'}
                </span>
                <span className={`badge badge-priority-${project.priority || 'medium'}`}>
                  {project.priority || 'Medium'}
                </span>
              </div>

              <div className="project-dates">
                {project.startDate && (
                  <div>📅 Start: {new Date(project.startDate).toLocaleDateString()}</div>
                )}
                {project.deadline && (
                  <div>🏁 Deadline: {new Date(project.deadline).toLocaleDateString()}</div>
                )}
              </div>

              <div className="progress-container">
                <div className="progress-header">
                  <span>Progress</span>
                  <span>{project.progress || 0}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${project.progress || 0}%` }}></div>
                </div>
              </div>

              <Link to={`/projects/${project._id}`} className="btn-view">
                Open Project →
              </Link>

              {user.role === 'admin' && (
                <button className="btn-delete-project" onClick={() => handleDelete(project._id)}>
                  Delete Project
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Projects;
