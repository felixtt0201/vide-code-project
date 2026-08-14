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

  // 搜尋和篩選
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  document.getElementById('statusFilter').addEventListener('change', handleFilter);
  document.getElementById('priorityFilter').addEventListener('change', handleFilter);
  document.getElementById('projectFilter').addEventListener('change', handleFilter);

  // Task 4：詳細頁面保存
  document.getElementById('saveDetailBtn')?.addEventListener('click', saveTaskDetail);
  document.getElementById('editNextActionBtn')?.addEventListener('click', () => {
    const nextAction = prompt('編輯 Next Action:', document.getElementById('detailNextAction').textContent);
    if (nextAction !== null) {
      const taskId = document.getElementById('taskDetailModal').dataset.currentTaskId;
      const task = state.tasks.find(t => t.id === taskId);
      if (task) {
        task.nextAction = nextAction;
        if (!task.workLogs) task.workLogs = [];
        task.workLogs.unshift({
          date: formatDate(today.toISOString().split('T')[0]),
          content: `Next Action 已更新為：${nextAction}`,
          notes: ''
        });
        openTaskDetailModal(taskId);
        renderTodayView();
      }
    }
  });

// ===== 搜尋與篩選 =====

function handleSearch() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const filtered = state.tasks.filter(t => t.name.toLowerCase().includes(searchTerm));
  renderAllTasksList(filtered);
}

function handleFilter() {
  const status = document.getElementById('statusFilter').value;
  const priority = document.getElementById('priorityFilter').value;
  const project = document.getElementById('projectFilter').value;

  let filtered = state.tasks;

  if (status) {
    filtered = filtered.filter(t => t.status === status);
  }
  if (priority) {
    filtered = filtered.filter(t => t.priority === priority);
  }
  if (project) {
    filtered = filtered.filter(t => t.projectId === project);
  }

  renderAllTasksList(filtered);
}

function renderAllTasksList(tasks) {
  const allTasksList = document.getElementById('allTasksList');
  
  if (tasks.length === 0) {
    allTasksList.innerHTML = '<p style="color: #999; font-size: 13px; text-align: center; padding: 20px;">未找到符合條件的事項</p>';
    return;
  }

  allTasksList.innerHTML = tasks.map(task => {
    const projectName = getProjectName(task.projectId);
    const featureName = getFeatureName(task.featureId);
    const overdue = isOverdue(task.dueDate, task.status);
    
    return `
      <div class="task-item" onclick="handleTaskClick('${task.id}')">
        <input type="checkbox" class="task-checkbox">
        <div class="task-content">
          <div class="task-header">
            <span class="task-title">${task.name}</span>
            <span class="priority-badge ${getPriorityClass(task.priority)}">${task.priority}</span>
            <span class="status-badge ${getStatusClass(task.status)}">${task.status}</span>
            ${overdue ? '<span class="overdue-badge">逾期</span>' : ''}
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
      const options = state.projects.map(p => `
        <option value="${p.id}">${p.name}</option>
      `).join('');
      
      if (select.id === 'featureProjectSelect') {
        select.innerHTML = '<option value="">-- 選擇專案 --</option>' + options;
      } else if (select.id === 'taskProjectSelect') {
        select.innerHTML = '<option value="">-- 選擇專案 --</option>' + options;
      } else {
        select.innerHTML = '<option value="">全部專案</option>' + options;
      }
    }
  });

  updateFeatureSelect();
}

function updateFeatureSelect() {
  const projectId = document.getElementById('taskProjectSelect').value;
  const featureSelect = document.getElementById('taskFeatureSelect');

  if (!projectId) {
    featureSelect.innerHTML = '<option value="">-- 先選擇專案 --</option>';
    return;
  }

  const features = getFeaturesByProject(projectId);
  const options = features.map(f => `
    <option value="${f.id}">${f.name}</option>
  `).join('');

  featureSelect.innerHTML = options || '<option value="">此專案無功能</option>';
}

// ===== 點擊處理 =====

function handleTaskClick(taskId) {
  openTaskDetailModal(taskId);
}

// ===== 詳細頁面 & 編輯 =====

// 打開追蹤事項詳細頁
function openTaskDetailModal(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  // 填充詳細信息
  document.getElementById('detailTaskName').textContent = task.name;
  document.getElementById('detailProjectName').textContent = getProjectName(task.projectId);
  document.getElementById('detailFeatureName').textContent = getFeatureName(task.featureId);
  document.getElementById('detailAssignee').textContent = task.assignee || '未指派';
  
  const priorityBadge = document.getElementById('detailPriority');
  priorityBadge.textContent = task.priority;
  priorityBadge.className = 'priority-badge ' + getPriorityClass(task.priority);
  
  const statusBadge = document.getElementById('detailStatus');
  statusBadge.textContent = task.status;
  statusBadge.className = 'status-badge ' + getStatusClass(task.status);
  
  document.getElementById('detailDueDate').textContent = formatDate(task.dueDate);
  document.getElementById('detailNextAction').textContent = task.nextAction || '（無）';

  // 顯示等待他人信息
  const waitingSection = document.getElementById('waitingSection');
  if (task.waiting && task.waiting.isWaiting) {
    waitingSection.style.display = 'block';
    document.getElementById('detailWaitingFor').textContent = task.waiting.waitingFor;
    document.getElementById('detailWaitingReason').textContent = task.waiting.reason;
    document.getElementById('detailNextFollowUp').textContent = formatDate(task.waiting.nextFollowUpDate);
  } else {
    waitingSection.style.display = 'none';
  }

  // 顯示工作紀錄
  const workLogsList = document.getElementById('workLogsList');
  if (task.workLogs && task.workLogs.length > 0) {
    workLogsList.innerHTML = task.workLogs.map(log => `
      <div style="padding: 10px; background-color: #f9f9f9; border-radius: 4px; margin-bottom: 8px;">
        <div style="font-weight: 600; font-size: 13px; color: #666;">${log.date}</div>
        <div style="font-size: 13px; color: #212121; margin-top: 3px;">${log.content}</div>
        ${log.notes ? '<div style="font-size: 12px; color: #999; margin-top: 3px;">' + log.notes + '</div>' : ''}
      </div>
    `).join('');
  } else {
    workLogsList.innerHTML = '<p style="font-size: 13px; color: #999;">暫無紀錄</p>';
  }

  // 保存當前任務 ID 以便後續修改
  document.getElementById('taskDetailModal').dataset.currentTaskId = taskId;
  
  // 設定狀態下拉
  document.getElementById('detailStatusSelect').value = '';

  // 打開模態
  document.getElementById('taskDetailModal').classList.remove('hidden');
}

// 保存詳細頁面修改
function saveTaskDetail() {
  const taskId = document.getElementById('taskDetailModal').dataset.currentTaskId;
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  const newStatus = document.getElementById('detailStatusSelect').value;
  
  if (newStatus && newStatus !== task.status) {
    // 更新狀態
    const oldStatus = task.status;
    task.status = newStatus;
    
    // 新增工作紀錄
    if (!task.workLogs) task.workLogs = [];
    task.workLogs.unshift({
      date: formatDate(today.toISOString().split('T')[0]),
      content: `狀態已從「${oldStatus}」變更為「${newStatus}」`,
      notes: ''
    });

    // 若改為等待他人，初始化等待資訊
    if (newStatus === '等待他人' && !task.waiting) {
      task.waiting = {
        isWaiting: true,
        waitingFor: '未指定',
        reason: '',
        nextFollowUpDate: today.toISOString().split('T')[0]
      };
    }
  }

  // 關閉模態並重新渲染
  document.getElementById('taskDetailModal').classList.add('hidden');
  renderTodayView();
}
