// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  renderTodayDate();
  renderTodayView();
  initializeEventListeners();
  populateProjectSelects();
}

// ===== 工具函數 =====

// 設定今天日期顯示
function renderTodayDate() {
  const todayDateEl = document.getElementById('todayDate');
  const options = { year: 'numeric', month: 'numeric', day: 'numeric' };
  todayDateEl.textContent = today.toLocaleDateString('zh-TW', options);
}

// 判斷是否逾期
function isOverdue(dueDate, status) {
  if (status === '已完成') return false;
  return new Date(dueDate) < today;
}

// 判斷是否今天
function isToday(dueDate) {
  const due = new Date(dueDate);
  return due.toDateString() === today.toDateString();
}

// 判斷是否即將到期（3 天內）
function isUrgent(dueDate) {
  const due = new Date(dueDate);
  const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  return diff >= 0 && diff <= 3;
}

// 格式化日期
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const options = { month: 'numeric', day: 'numeric' };
  return date.toLocaleDateString('zh-TW', options);
}

// 計算逾期天數
function getOverdueDays(dueDate) {
  const due = new Date(dueDate);
  const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
  return diff;
}

// 取得優先級 CSS 類別
function getPriorityClass(priority) {
  const map = {
    '高': 'priority-high',
    '中': 'priority-medium',
    '低': 'priority-low'
  };
  return map[priority] || '';
}

// 取得狀態 CSS 類別
function getStatusClass(status) {
  const map = {
    '待處理': 'status-pending',
    '進行中': 'status-inprogress',
    '等待他人': 'status-waiting',
    '已完成': 'status-completed'
  };
  return map[status] || '';
}

// 取得專案名稱（依 ID）
function getProjectName(projectId) {
  const project = state.projects.find(p => p.id === projectId);
  return project ? project.name : '未知專案';
}

// 取得功能名稱（依 ID）
function getFeatureName(featureId) {
  const feature = state.features.find(f => f.id === featureId);
  return feature ? feature.name : '未知功能';
}

// 取得功能（依專案 ID）
function getFeaturesByProject(projectId) {
  return state.features.filter(f => f.projectId === projectId);
}

// ===== 計算函數 =====

// 取得逾期事項
function getOverdueTasks() {
  return state.tasks.filter(t => isOverdue(t.dueDate, t.status));
}

// 取得今日需要處理的事項
function getTodayTasks() {
  return state.tasks.filter(t => {
    if (t.status === '已完成') return false;
    return isToday(t.dueDate) || (t.nextAction && isToday(t.dueDate));
  });
}

// 取得等待他人的事項
function getWaitingTasks() {
  return state.tasks.filter(t => t.status === '等待他人' && t.waiting && t.waiting.isWaiting);
}

// 依等待對象分組
function groupWaitingByTarget() {
  const groups = {};
  getWaitingTasks().forEach(task => {
    const target = task.waiting.waitingFor || '其他';
    if (!groups[target]) {
      groups[target] = [];
    }
    groups[target].push(task);
  });
  return groups;
}

// 計算專案進度（依功能完成率）
function calculateProjectProgress(projectId) {
  const projectFeatures = state.features.filter(f => f.projectId === projectId);
  if (projectFeatures.length === 0) return 0;

  const completedFeatures = projectFeatures.filter(f => f.status === '已完成').length;
  return Math.round((completedFeatures / projectFeatures.length) * 100);
}

// ===== 渲染函數 =====

// 渲染首頁
function renderTodayView() {
  renderOverdueTasks();
  renderTodayTasks();
  renderWaitingTasks();
  renderProjectProgress();
}

// 渲染逾期事項
function renderOverdueTasks() {
  const overdueTasks = getOverdueTasks();
  const overdueList = document.getElementById('overdueList');
  const overdueCount = document.getElementById('overdueCount');

  overdueCount.textContent = overdueTasks.length;

  if (overdueTasks.length === 0) {
    overdueList.innerHTML = '<p style="color: #999; font-size: 13px; text-align: center; padding: 20px;">暫無逾期事項</p>';
    return;
  }

  overdueList.innerHTML = overdueTasks.map(task => {
    const overdueDays = getOverdueDays(task.dueDate);
    const projectName = getProjectName(task.projectId);
    const featureName = getFeatureName(task.featureId);
    return `
      <div class="task-item" onclick="handleTaskClick('${task.id}')">
        <input type="checkbox" class="task-checkbox">
        <div class="task-content">
          <div class="task-header">
            <span class="task-title">${task.name}</span>
            <span class="priority-badge ${getPriorityClass(task.priority)}">${task.priority}</span>
            <span class="status-badge ${getStatusClass(task.status)}">${task.status}</span>
            <span class="overdue-badge">逾期 ${overdueDays} 天</span>
          </div>
          <div class="task-meta">
            <strong>${projectName}</strong> / ${featureName}
            | 期限: ${formatDate(task.dueDate)}
            ${task.assignee ? ' | 負責人: ' + task.assignee : ''}
          </div>
          ${task.nextAction ? '<div class="task-next-action">Next: ' + task.nextAction + '</div>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

// 渲染今日需要處理
function renderTodayTasks() {
  const todayTasks = getTodayTasks();
  const todayList = document.getElementById('todayList');
  const todayCount = document.getElementById('todayCount');

  todayCount.textContent = todayTasks.length;

  if (todayTasks.length === 0) {
    todayList.innerHTML = '<p style="color: #999; font-size: 13px; text-align: center; padding: 20px;">今天暫無待處理事項</p>';
    return;
  }

  todayList.innerHTML = todayTasks.map(task => {
    const projectName = getProjectName(task.projectId);
    const featureName = getFeatureName(task.featureId);
    return `
      <div class="task-item" onclick="handleTaskClick('${task.id}')">
        <input type="checkbox" class="task-checkbox">
        <div class="task-content">
          <div class="task-header">
            <span class="task-title">${task.name}</span>
            <span class="priority-badge ${getPriorityClass(task.priority)}">${task.priority}</span>
            <span class="status-badge ${getStatusClass(task.status)}">${task.status}</span>
          </div>
          <div class="task-meta">
            <strong>${projectName}</strong> / ${featureName}
            | 期限: 今天
            ${task.assignee ? ' | 負責人: ' + task.assignee : ''}
          </div>
          ${task.nextAction ? '<div class="task-next-action">Next: ' + task.nextAction + '</div>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

// 渲染等待他人
function renderWaitingTasks() {
  const waitingGroups = groupWaitingByTarget();
  const waitingList = document.getElementById('waitingList');
  const waitingCount = document.getElementById('waitingCount');

  const totalWaiting = getWaitingTasks().length;
  waitingCount.textContent = totalWaiting;

  if (totalWaiting === 0) {
    waitingList.innerHTML = '<p style="color: #999; font-size: 13px; text-align: center; padding: 20px;">暫無等待他人的事項</p>';
    return;
  }

  let html = '';
  Object.entries(waitingGroups).forEach(([target, tasks]) => {
    html += `<div class="waiting-group">
      <div class="waiting-group-title">等待 ${target} (${tasks.length} 件)</div>`;
    
    tasks.forEach(task => {
      const nextFollowUp = task.waiting.nextFollowUpDate ? formatDate(task.waiting.nextFollowUpDate) : '未設定';
      const projectName = getProjectName(task.projectId);
      const featureName = getFeatureName(task.featureId);
      html += `
        <div class="waiting-item" onclick="handleTaskClick('${task.id}')">
          <div><strong>${projectName}</strong> / ${featureName}</div>
          <div>${task.name}</div>
          <div class="waiting-reason">
            <span style="font-weight: 500;">等待原因:</span> ${task.waiting.reason}
          </div>
          <div class="waiting-reason">
            <span style="font-weight: 500;">下一追蹤:</span> ${nextFollowUp}
          </div>
        </div>
      `;
    });

    html += '</div>';
  });

  waitingList.innerHTML = html;
}

// 渲染專案進度
function renderProjectProgress() {
  const progressList = document.getElementById('projectProgressList');

  progressList.innerHTML = state.projects.map(project => {
    const progress = calculateProjectProgress(project.id);
    const features = state.features.filter(f => f.projectId === project.id);
    const completedFeatures = features.filter(f => f.status === '已完成').length;

    return `
      <div class="progress-item">
        <div class="progress-info">
          <div class="progress-name">${project.name}</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
          <div class="progress-text">${progress}% 完成</div>
          <div class="progress-count">${completedFeatures} / ${features.length} 功能完成</div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== 事件監聽 =====

function initializeEventListeners() {
  // FAB 按鈕
  const fabAdd = document.getElementById('fabAdd');
  const fabMenu = document.getElementById('fabMenu');

  fabAdd.addEventListener('click', () => {
    fabMenu.classList.toggle('hidden');
  });

  // FAB 菜單項
  document.getElementById('addProjectBtn').addEventListener('click', openAddProjectModal);
  document.getElementById('addFeatureBtn').addEventListener('click', openAddFeatureModal);
  document.getElementById('addTaskBtn').addEventListener('click', openAddTaskModal);

  // 模態窗口關閉
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) {
        modal.classList.add('hidden');
      }
    });
  });

  // 模態窗口背景點擊關閉
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) {
        modal.classList.add('hidden');
      }
    });
  });

  // 表單提交
  document.getElementById('addProjectForm').addEventListener('submit', handleAddProject);
  document.getElementById('addFeatureForm').addEventListener('submit', handleAddFeature);
  document.getElementById('addTaskForm').addEventListener('submit', handleAddTask);

  // 功能下拉聯動
  document.getElementById('taskProjectSelect').addEventListener('change', updateFeatureSelect);

  // 搜尋和篩選（暫未實現）
  // document.getElementById('searchInput').addEventListener('input', handleSearch);
  // document.getElementById('statusFilter').addEventListener('change', handleFilter);
}

// ===== 模態操作 =====

function openAddProjectModal() {
  document.getElementById('addProjectModal').classList.remove('hidden');
}

function openAddFeatureModal() {
  document.getElementById('addFeatureModal').classList.remove('hidden');
}

function openAddTaskModal() {
  document.getElementById('addTaskModal').classList.remove('hidden');
}

// ===== 表單提交 =====

function handleAddProject(e) {
  e.preventDefault();

  const newProject = {
    id: 'p' + Date.now(),
    name: document.getElementById('projectName').value,
    description: document.getElementById('projectDescription').value,
    status: document.getElementById('projectStatus').value,
    startDate: document.getElementById('projectStartDate').value,
    targetDate: document.getElementById('projectTargetDate').value,
    notes: ''
  };

  state.projects.push(newProject);
  document.getElementById('addProjectModal').classList.add('hidden');
  document.getElementById('addProjectForm').reset();
  populateProjectSelects();
  renderTodayView();
}

function handleAddFeature(e) {
  e.preventDefault();

  const newFeature = {
    id: 'f' + Date.now(),
    projectId: document.getElementById('featureProjectSelect').value,
    name: document.getElementById('featureName').value,
    description: document.getElementById('featureDescription').value,
    status: document.getElementById('featureStatus').value,
    priority: document.getElementById('featurePriority').value,
    targetDate: document.getElementById('featureTargetDate').value,
    assignee: document.getElementById('featureAssignee').value
  };

  state.features.push(newFeature);
  document.getElementById('addFeatureModal').classList.add('hidden');
  document.getElementById('addFeatureForm').reset();
  populateProjectSelects();
  renderTodayView();
}

function handleAddTask(e) {
  e.preventDefault();

  const newTask = {
    id: 't' + Date.now(),
    projectId: document.getElementById('taskProjectSelect').value,
    featureId: document.getElementById('taskFeatureSelect').value,
    name: document.getElementById('taskName').value,
    priority: document.getElementById('taskPriority').value,
    status: document.getElementById('taskStatus').value,
    dueDate: document.getElementById('taskDueDate').value,
    nextAction: document.getElementById('taskNextAction').value,
    assignee: document.getElementById('taskAssignee').value,
    waiting: null,
    notes: '',
    workLogs: []
  };

  state.tasks.push(newTask);
  document.getElementById('addTaskModal').classList.add('hidden');
  document.getElementById('addTaskForm').reset();
  populateProjectSelects();
  renderTodayView();
}

// ===== 填充下拉選單 =====

function populateProjectSelects() {
  const projectSelects = [
    document.getElementById('featureProjectSelect'),
    document.getElementById('taskProjectSelect'),
    document.getElementById('projectFilter')
  ];

  projectSelects.forEach(select => {
    if (select) {
      select.innerHTML = state.projects.map(p => `
        <option value="${p.id}">${p.name}</option>
      `).join('');
    }
  });

  updateFeatureSelect();
}

function updateFeatureSelect() {
  const projectId = document.getElementById('taskProjectSelect').value;
  const featureSelect = document.getElementById('taskFeatureSelect');

  const features = getFeaturesByProject(projectId);
  featureSelect.innerHTML = features.map(f => `
    <option value="${f.id}">${f.name}</option>
  `).join('');
}

// ===== 點擊處理 =====

function handleTaskClick(taskId) {
  console.log('點擊任務:', taskId);
  // Task 4 時實現詳細頁面
}
