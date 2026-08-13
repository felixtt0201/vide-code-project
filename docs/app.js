// Initialize page on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  renderOverview();
  initializeEventListeners();
  populateTaskList(tasks);
});

// Render overview page
function renderOverview() {
  document.getElementById('projectName').textContent = project.name;
  document.getElementById('projectCreated').textContent = project.createdDate;
  document.getElementById('projectTarget').textContent = project.targetDate;
  document.getElementById('progressFill').style.width = project.progress + '%';
  document.getElementById('progressText').textContent = project.progress + '% 完成';

  const counts = getStatusCounts();
  document.getElementById('countPending').textContent = counts.pending;
  document.getElementById('countInProgress').textContent = counts.inProgress;
  document.getElementById('countCompleted').textContent = counts.completed;

  const priorityCounts = getPriorityCounts();
  document.getElementById('countHigh').textContent = priorityCounts.high;
  document.getElementById('countMedium').textContent = priorityCounts.medium;
  document.getElementById('countLow').textContent = priorityCounts.low;

  renderUrgentTasks();
}

// Get status counts
function getStatusCounts() {
  return {
    pending: tasks.filter(t => t.status === '待處理').length,
    inProgress: tasks.filter(t => t.status === '進行中').length,
    completed: tasks.filter(t => t.status === '已完成').length
  };
}

// Get priority counts
function getPriorityCounts() {
  return {
    high: tasks.filter(t => t.priority === '高').length,
    medium: tasks.filter(t => t.priority === '中').length,
    low: tasks.filter(t => t.priority === '低').length
  };
}

// Get timeline status
function getTimelineStatus(dueDate, status) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  if (status === '已完成') return 'normal';
  if (diff < 0) return 'overdue';
  if (diff <= 3) return 'urgent';
  return 'normal';
}

// Render urgent tasks
function renderUrgentTasks() {
  const urgentList = document.getElementById('urgentList');
  urgentList.innerHTML = '';

  const urgent = tasks.filter(t => {
    const status = getTimelineStatus(t.dueDate, t.status);
    return status === 'overdue' || status === 'urgent';
  });

  if (urgent.length === 0) {
    urgentList.innerHTML = '<p style="color: #999; font-size: 14px;">暫無逾期或即將到期的事項</p>';
    return;
  }

  urgent.forEach(task => {
    const status = getTimelineStatus(task.dueDate, task.status);
    const item = document.createElement('div');
    item.className = 'urgent-item ' + status;
    
    const icon = status === 'overdue' ? '🔴' : '🟡';
    item.textContent = icon + ' ' + task.name + ' - ' + task.dueDate;
    
    urgentList.appendChild(item);
  });
}

// Populate task list
function populateTaskList(taskList) {
  const tbody = document.getElementById('taskList');
  tbody.innerHTML = '';

  taskList.forEach(task => {
    const row = document.createElement('tr');
    
    const timeline = getTimelineStatus(task.dueDate, task.status);
    const timelineClass = timeline === 'overdue' ? 'timeline overdue' :
                         timeline === 'urgent' ? 'timeline urgent' : '';
    const timelineLabel = timeline === 'overdue' ? '🔴 ' + task.dueDate :
                         timeline === 'urgent' ? '🟡 ' + task.dueDate : task.dueDate;

    row.innerHTML = `
      <td><strong>${task.name}</strong></td>
      <td>${task.assignee}</td>
      <td><span class="priority ${getPriorityClass(task.priority)}">${task.priority}</span></td>
      <td><span class="status ${getStatusClass(task.status)}">${task.status}</span></td>
      <td><span class="${timelineClass}">${timelineLabel}</span></td>
    `;

    row.style.cursor = 'pointer';
    row.addEventListener('click', () => showModal(task));
    
    tbody.appendChild(row);
  });
}

// Get priority class
function getPriorityClass(priority) {
  const map = {
    '高': 'high',
    '中': 'medium',
    '低': 'low'
  };
  return map[priority] || '';
}

// Get status class
function getStatusClass(status) {
  const map = {
    '待處理': 'pending',
    '進行中': 'in-progress',
    '已完成': 'completed'
  };
  return map[status] || '';
}

// Show modal with task details
function showModal(task) {
  document.getElementById('modalTitle').textContent = task.name;
  document.getElementById('modalAssignee').textContent = task.assignee;
  document.getElementById('modalPriority').textContent = task.priority;
  document.getElementById('modalStatus').textContent = task.status;
  document.getElementById('modalDueDate').textContent = task.dueDate;
  document.getElementById('modalCreatedDate').textContent = task.createdDate;
  document.getElementById('modalDescription').textContent = task.description;

  document.getElementById('modal').classList.remove('hidden');
}

// Hide modal
function hideModal() {
  document.getElementById('modal').classList.add('hidden');
}

// Switch between views
function switchView(viewName) {
  const views = document.querySelectorAll('.view');
  views.forEach(view => view.classList.add('hidden'));

  if (viewName === 'overview') {
    document.getElementById('overview').classList.remove('hidden');
  } else if (viewName === 'list') {
    document.getElementById('list').classList.remove('hidden');
  }
}

// Filter tasks by status
function filterTasks(status) {
  const filtered = status === 'all' ? tasks : tasks.filter(t => t.status === status);

  populateTaskList(filtered);

  const counts = {
    'all': tasks.length,
    '待處理': tasks.filter(t => t.status === '待處理').length,
    '進行中': tasks.filter(t => t.status === '進行中').length,
    '已完成': tasks.filter(t => t.status === '已完成').length
  };

  const statusText = status === 'all' ? '全部事項' : status;
  document.getElementById('filterText').textContent = `顯示 ${counts[status]} 筆${statusText}`;
}

// Initialize event listeners
function initializeEventListeners() {
  // View all button
  document.getElementById('viewAllBtn').addEventListener('click', () => {
    switchView('list');
    filterTasks('all');
    updateFilterButtons('all');
  });

  // Back button
  document.getElementById('backBtn').addEventListener('click', () => {
    switchView('overview');
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      filterTasks(filter);
      updateFilterButtons(filter);
    });
  });

  // Modal close button
  document.getElementById('closeModal').addEventListener('click', hideModal);

  // Modal overlay click
  document.querySelector('.modal-overlay').addEventListener('click', hideModal);

  // Modal content click (prevent closing when clicking content)
  document.querySelector('.modal-content').addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// Update filter button active state
function updateFilterButtons(activeFilter) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.dataset.filter === activeFilter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}
