// TPO Portal JavaScript
const API_BASE = 'http://127.0.0.1:8000';

// Global variables
let currentUser = null;
let jobsData = [];
let applicationsData = [];
let trainingsData = [];
let myTrainingsData = [];
let resumeAnalysesData = [];
let profileData = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupEventListeners();
});

// Check authentication status
function checkAuth() {
    const token = localStorage.getItem('tpo_jwt');
    if (token) {
        // Verify token with backend
        fetch(`${API_BASE}/api/user/`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Token invalid');
            }
        })
        .then(user => {
            currentUser = user;
            showMainApp();
            loadDashboard();
        })
        .catch(error => {
            console.error('Auth check failed:', error);
            logout();
        });
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', doLogin);
    
    // Registration form
    document.getElementById('registerForm').addEventListener('submit', doRegister);
    
    // Profile form
    document.getElementById('profileForm')?.addEventListener('submit', saveProfile);
    
    // Wellness form
    document.getElementById('wellnessForm')?.addEventListener('submit', analyzeWellness);
    
    // File uploads
    document.getElementById('resumeUpload')?.addEventListener('change', uploadResume);
    document.getElementById('certificatesUpload')?.addEventListener('change', uploadCertificates);
    
    // Wellness sliders
    setupWellnessSliders();
    
    // Resume upload
    setupResumeUpload();
    
    // Sidebar toggle for mobile
    document.getElementById('sidebarToggle')?.addEventListener('click', toggleSidebar);
    
    // Job search and filter
    document.getElementById('jobSearch')?.addEventListener('input', filterJobs);
    document.getElementById('jobFilter')?.addEventListener('change', filterJobs);
}

// Login function
function doLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    fetch(`${API_BASE}/api/login/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.access) {
            localStorage.setItem('tpo_jwt', data.access);
            localStorage.setItem('tpo_refresh', data.refresh);
            
            // Get user info
            fetch(`${API_BASE}/api/user/`, {
                headers: {
                    'Authorization': `Bearer ${data.access}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(user => {
                currentUser = user;
                showMainApp();
                loadDashboard();
            });
        } else {
            alert('Login failed. Please check your credentials.');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    });
}

// Registration function
function doRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    // Validate passwords match
    if (password !== confirmPassword) {
        alert('Passwords do not match. Please try again.');
        return;
    }
    
    // Validate password length
    if (password.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
    }
    
    fetch(`${API_BASE}/api/register/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: name,
            email: email,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.detail && data.detail.includes('Registration successful')) {
            alert('Registration successful! You can now login.');
            showLoginForm();
            
            // Pre-fill login form with registered email
            document.getElementById('loginEmail').value = email;
            document.getElementById('loginPassword').value = '';
            document.getElementById('loginPassword').focus();
        } else {
            alert(data.detail || 'Registration failed. Please try again.');
        }
    })
    .catch(error => {
        console.error('Registration error:', error);
        alert('Registration failed. Please try again.');
    });
}

// Show registration form
function showRegisterForm() {
    document.getElementById('loginFormContainer').classList.add('d-none');
    document.getElementById('registerFormContainer').classList.remove('d-none');
    
    // Clear registration form
    document.getElementById('registerForm').reset();
}

// Show login form
function showLoginForm() {
    document.getElementById('registerFormContainer').classList.add('d-none');
    document.getElementById('loginFormContainer').classList.remove('d-none');
    
    // Clear login form
    document.getElementById('loginForm').reset();
}

// Show main application
function showMainApp() {
    document.getElementById('authOverlay').classList.add('d-none');
    document.getElementById('mainApp').classList.remove('d-none');
    
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.email.split('@')[0];
    }
    
    // Start auto-refresh for jobs
    startAutoRefresh();
}

// Logout function
function logout() {
    localStorage.removeItem('tpo_jwt');
    localStorage.removeItem('tpo_refresh');
    currentUser = null;
    
    document.getElementById('authOverlay').classList.remove('d-none');
    document.getElementById('mainApp').classList.add('d-none');
    
    // Reset forms and show login form
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
    showLoginForm();
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('d-none');
    });
    
    // Show selected section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.remove('d-none');
    }
    
    // Update nav active state
    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    event.target.classList.add('active');
    
    // Load section-specific data
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'jobs':
            loadJobs();
            break;
        case 'applications':
            loadApplications();
            break;
        case 'trainings':
            loadTrainings();
            break;
        case 'resume-analyzer':
            loadResumeAnalyses();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'wellness':
            // Wellness section loads automatically
            break;
    }
}

// Load dashboard data
function loadDashboard() {
    // Load jobs for recent section
    loadJobs(true);
    
    // Load profile for stats
    loadProfile(true);
    
    // Load applications for stats
    loadApplications(true);
    
    // Load wellness score
    loadWellnessScore();
}

// Load progress summary
function loadProgressSummary() {
    const token = localStorage.getItem('tpo_jwt');
    
    fetch(`${API_BASE}/api/student/progress/summary/`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        updateProgressDisplay(data);
        updateRecentActivities(data.recent_activities);
        updateAchievements(data.achievements);
        updateMilestones(data.next_milestones);
    })
    .catch(error => {
        console.error('Error loading progress summary:', error);
    });
}

// Update progress display
function updateProgressDisplay(data) {
    // Update overall progress
    document.getElementById('overallProgress').textContent = `${data.total_progress}%`;
    document.getElementById('overallProgressBar').style.width = `${data.total_progress}%`;
    document.getElementById('overallProgressText').textContent = `${data.total_progress}% Complete`;
    
    // Update category progress
    updateCategoryProgress('profile', data.profile_completion);
    updateCategoryProgress('aptitude', data.aptitude_progress);
    updateCategoryProgress('technical', data.technical_progress);
    updateCategoryProgress('interview', data.interview_progress);
    updateCategoryProgress('resume', data.resume_progress);
    updateCategoryProgress('applications', data.applications_progress);
    updateCategoryProgress('trainings', data.trainings_progress);
    updateCategoryProgress('wellness', data.wellness_progress);
}

// Update category progress
function updateCategoryProgress(category, progress) {
    const progressBar = document.getElementById(`${category}ProgressBar`);
    const progressText = document.getElementById(`${category}ProgressText`);
    
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
    }
    
    if (progressText) {
        progressText.textContent = `${progress}%`;
    }
}

// Update recent activities
function updateRecentActivities(activities) {
    const container = document.getElementById('recentActivities');
    
    if (!activities || activities.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No recent activities</p>';
        return;
    }
    
    const activitiesHtml = activities.map(activity => `
        <div class="d-flex align-items-start mb-3">
            <div class="flex-shrink-0">
                <div class="badge bg-${getActivityColor(activity.activity_type)} rounded-circle p-2">
                    <i class="fas ${getActivityIcon(activity.activity_type)}"></i>
                </div>
            </div>
            <div class="flex-grow-1 ms-3">
                <h6 class="mb-1">${activity.description}</h6>
                <small class="text-muted">${formatDate(activity.created_at)}</small>
                <div class="mt-1">
                    <span class="badge bg-light text-dark">+${activity.points_earned} points</span>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = activitiesHtml;
}

// Update achievements
function updateAchievements(achievements) {
    const container = document.getElementById('achievementsList');
    
    if (!achievements || achievements.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No achievements yet</p>';
        return;
    }
    
    const achievementsHtml = achievements.map(achievement => `
        <div class="d-flex align-items-center mb-2">
            <i class="fas fa-trophy text-warning me-2"></i>
            <span>${achievement}</span>
        </div>
    `).join('');
    
    container.innerHTML = achievementsHtml;
}

// Update milestones
function updateMilestones(milestones) {
    const container = document.getElementById('nextMilestones');
    
    if (!milestones || milestones.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">All milestones completed!</p>';
        return;
    }
    
    const milestonesHtml = milestones.map(milestone => `
        <div class="d-flex align-items-center mb-2">
            <i class="fas fa-flag text-primary me-2"></i>
            <small>${milestone}</small>
        </div>
    `).join('');
    
    container.innerHTML = milestonesHtml;
}

// Get activity color
function getActivityColor(activityType) {
    const colors = {
        'profile_update': 'info',
        'aptitude_test': 'success',
        'technical_problem': 'warning',
        'interview_practice': 'danger',
        'resume_upload': 'primary',
        'job_application': 'secondary',
        'training_registered': 'dark',
        'wellness_check': 'light'
    };
    return colors[activityType] || 'secondary';
}

// Get activity icon
function getActivityIcon(activityType) {
    const icons = {
        'profile_update': 'fa-user',
        'aptitude_test': 'fa-brain',
        'technical_problem': 'fa-code',
        'interview_practice': 'fa-comments',
        'resume_upload': 'fa-file-alt',
        'job_application': 'fa-briefcase',
        'training_registered': 'fa-graduation-cap',
        'wellness_check': 'fa-heartbeat'
    };
    return icons[activityType] || 'fa-check';
}

// Update progress for specific category
function updateProgress(category, completedItem) {
    const token = localStorage.getItem('tpo_jwt');
    
    fetch(`${API_BASE}/api/student/progress/update/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            category: category,
            completed_item: completedItem
        })
    })
    .then(response => response.json())
    .then(data => {
        // Refresh progress summary
        loadProgressSummary();
    })
    .catch(error => {
        console.error('Error updating progress:', error);
    });
}

// Track progress for external links
function trackProgress(category, activity) {
    // Update progress in background
    updateProgress(category, activity);
    
    // Show a subtle notification
    showProgressNotification(category, activity);
    
    return true; // Allow the link to open normally
}

// Show progress notification
function showProgressNotification(category, activity) {
    const notification = document.createElement('div');
    notification.className = 'position-fixed bottom-0 end-0 p-3';
    notification.style.zIndex = '9999';
    notification.innerHTML = `
        <div class="toast show" role="alert">
            <div class="toast-header">
                <i class="fas fa-check-circle text-success me-2"></i>
                <strong class="me-auto">Progress Tracked!</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${getCategoryName(category)} progress updated!
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Get category display name
function getCategoryName(category) {
    const names = {
        'profile': 'Profile Completion',
        'aptitude': 'Aptitude Preparation',
        'technical': 'Technical Skills',
        'interview': 'Interview Preparation',
        'resume': 'Resume Building',
        'applications': 'Job Applications',
        'trainings': 'Training Programs',
        'wellness': 'Wellness Activities'
    };
    return names[category] || category;
}

// Load jobs
function loadJobs(isDashboard = false) {
    const token = localStorage.getItem('tpo_jwt');
    
    fetch(`${API_BASE}/api/jobs/`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(jobs => {
        jobsData = Array.isArray(jobs) ? jobs : (jobs.results || []);
        
        if (isDashboard) {
            // Show only recent jobs (first 3)
            renderRecentJobs(jobsData.slice(0, 3));
            document.getElementById('jobCount').textContent = jobsData.length;
        } else {
            renderAllJobs(jobsData);
        }
    })
    .catch(error => {
        console.error('Error loading jobs:', error);
        const container = isDashboard ? 'recentJobs' : 'jobsList';
        document.getElementById(container).innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Unable to load jobs. Please try again later.
            </div>
        `;
    });
}

// Render recent jobs
function renderRecentJobs(jobs) {
    const container = document.getElementById('recentJobs');
    
    if (jobs.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-briefcase fa-3x mb-3"></i>
                <p>No job opportunities available at the moment.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = jobs.map(job => `
        <div class="job-card">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                    <h6 class="job-title">${job.role}</h6>
                    <p class="job-company">${job.company_name}</p>
                    <span class="badge bg-secondary me-2">${job.category || 'Other'}</span>
                    ${job.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-danger">Closed</span>'}
                </div>
                <span class="badge bg-primary">${job.ctc}</span>
            </div>
            <div class="job-meta">
                <div class="job-meta-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${job.location || 'Not specified'}</span>
                </div>
                <div class="job-meta-item">
                    <i class="fas fa-graduation-cap"></i>
                    <span>${job.eligibility || 'Not specified'}</span>
                </div>
                ${job.deadline ? `
                <div class="job-meta-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Deadline: ${new Date(job.deadline).toLocaleDateString()}</span>
                </div>
                ` : ''}
            </div>
            ${job.description ? `
            <div class="job-description mb-3">
                <small class="text-muted">${job.description.substring(0, 150)}${job.description.length > 150 ? '...' : ''}</small>
            </div>
            ` : ''}
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-primary" onclick="applyToJob(${job.id})" ${!job.is_active ? 'disabled' : ''}>
                    <i class="fas fa-paper-plane me-1"></i>Apply
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="viewJobDetails(${job.id})">
                    <i class="fas fa-eye me-1"></i>Details
                </button>
            </div>
        </div>
    `).join('');
}

// Render all jobs
function renderAllJobs(jobs) {
    const container = document.getElementById('jobsList');
    
    if (jobs.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fas fa-briefcase fa-3x mb-3"></i>
                <p>No job opportunities available at the moment.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = jobs.map(job => `
        <div class="job-card" data-job-id="${job.id}">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                    <h6 class="job-title">${job.role}</h6>
                    <p class="job-company">${job.company_name}</p>
                    <span class="badge bg-secondary me-2">${job.category || 'Other'}</span>
                    ${job.is_active ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-danger">Closed</span>'}
                </div>
                <span class="badge bg-primary">${job.ctc}</span>
            </div>
            <div class="job-meta">
                <div class="job-meta-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${job.location || 'Not specified'}</span>
                </div>
                <div class="job-meta-item">
                    <i class="fas fa-graduation-cap"></i>
                    <span>${job.eligibility || 'Not specified'}</span>
                </div>
                ${job.deadline ? `
                <div class="job-meta-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span>Deadline: ${new Date(job.deadline).toLocaleDateString()}</span>
                </div>
                ` : ''}
            </div>
            ${job.description ? `
            <div class="job-description mb-3">
                <p class="text-muted">${job.description}</p>
            </div>
            ` : ''}
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-primary" onclick="applyToJob(${job.id})" ${!job.is_active ? 'disabled' : ''}>
                    <i class="fas fa-paper-plane me-1"></i>Apply
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="viewJobDetails(${job.id})">
                    <i class="fas fa-eye me-1"></i>Details
                </button>
            </div>
        </div>
    `).join('');
}

// Apply to job
function applyToJob(jobId) {
    const token = localStorage.getItem('tpo_jwt');
    
    // Check if already applied
    const existingApplication = applicationsData?.find(app => app.job.id === jobId);
    if (existingApplication) {
        alert('You have already applied to this job!');
        return;
    }
    
    // Show application modal
    showApplicationModal(jobId);
}

// View job details
function viewJobDetails(jobId) {
    const job = jobsData.find(j => j.id === jobId);
    if (job) {
        alert(`Job Details:\n\nCompany: ${job.company_name}\nRole: ${job.role}\nCTC: ${job.ctc}\nLocation: ${job.location || 'Not specified'}\nEligibility: ${job.eligibility || 'Not specified'}\n\nClick Apply to submit your application.`);
    }
}

// Filter jobs
function filterJobs() {
    const searchTerm = document.getElementById('jobSearch').value.toLowerCase();
    const filterCategory = document.getElementById('jobFilter').value;
    
    const filteredJobs = jobsData.filter(job => {
        const matchesSearch = !searchTerm || 
            job.company_name.toLowerCase().includes(searchTerm) ||
            job.role.toLowerCase().includes(searchTerm) ||
            (job.location && job.location.toLowerCase().includes(searchTerm)) ||
            (job.description && job.description.toLowerCase().includes(searchTerm));
            
        const matchesFilter = !filterCategory || 
            job.category === filterCategory;
            
        const matchesActive = job.is_active !== false;
            
        return matchesSearch && matchesFilter && matchesActive;
    });
    
    renderAllJobs(filteredJobs);
}

// Auto-refresh jobs every 30 seconds
function startAutoRefresh() {
    setInterval(() => {
        const currentSection = document.querySelector('.content-section:not(.d-none)');
        if (currentSection && (currentSection.id === 'dashboard-section' || currentSection.id === 'jobs-section')) {
            loadJobs(currentSection.id === 'dashboard-section');
        }
    }, 30000); // 30 seconds
}

// Enhanced view job details
function viewJobDetails(jobId) {
    const job = jobsData.find(j => j.id === jobId);
    if (job) {
        const deadlineText = job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Not specified';
        const statusText = job.is_active ? 'Active' : 'Closed';
        const statusClass = job.is_active ? 'success' : 'danger';
        
        alert(`Job Details:\n\nCompany: ${job.company_name}\nRole: ${job.role}\nCategory: ${job.category || 'Other'}\nCTC: ${job.ctc}\nLocation: ${job.location || 'Not specified'}\nEligibility: ${job.eligibility || 'Not specified'}\nDeadline: ${deadlineText}\nStatus: ${statusText}\n\n${job.description ? 'Description:\n' + job.description : ''}\n\nClick Apply to submit your application.`);
    }
}

// Load profile
function loadProfile(isDashboard = false) {
    const token = localStorage.getItem('tpo_jwt');
    
    fetch(`${API_BASE}/api/student/me/`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(profile => {
        profileData = profile;
        
        if (isDashboard) {
            // Update dashboard stats
            document.getElementById('cgpaDisplay').textContent = profile.cgpa || '0.0';
            document.getElementById('appliedCount').textContent = '0'; // This would come from applications data
        } else {
            // Fill profile form
            fillProfileForm(profile);
        }
    })
    .catch(error => {
        console.error('Error loading profile:', error);
    });
}

// Fill profile form
function fillProfileForm(profile) {
    const fields = {
        'rollNumber': profile.roll_number,
        'department': profile.department,
        'year': profile.year,
        'contactNumber': profile.contact_number,
        'tenthPercentage': profile.tenth_percentage,
        'twelfthPercentage': profile.twelfth_percentage,
        'cgpa': profile.cgpa,
        'backlogs': profile.num_backlogs,
        'programmingLanguages': profile.programming_languages,
        'coreSubjects': profile.core_subjects,
        'toolsTechnologies': profile.tools_technologies,
        'jobRoles': profile.job_roles,
        'preferredDomain': profile.preferred_domain,
        'internshipOrg': profile.internship_org,
        'internshipDuration': profile.internship_duration,
        'relocation': profile.relocation
    };
    
    Object.keys(fields).forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = fields[fieldId] || false;
            } else {
                element.value = fields[fieldId] || '';
            }
        }
    });
}

// Save profile
function saveProfile(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('tpo_jwt');
    const formData = new FormData(event.target);
    
    // Convert FormData to JSON
    const profileData = {};
    for (let [key, value] of formData.entries()) {
        profileData[key] = value;
    }
    
    fetch(`${API_BASE}/api/student/me/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        alert('Profile saved successfully!');
        loadDashboard();
    })
    .catch(error => {
        console.error('Error saving profile:', error);
        alert('Failed to save profile. Please try again.');
    });
}

// Upload resume
function uploadResume(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const token = localStorage.getItem('tpo_jwt');
    const formData = new FormData();
    formData.append('resume', file);
    
    fetch(`${API_BASE}/api/student/me/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        alert('Resume uploaded successfully!');
        loadDashboard();
    })
    .catch(error => {
        console.error('Error uploading resume:', error);
        alert('Failed to upload resume. Please try again.');
    });
}

// Upload certificates
function uploadCertificates(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const token = localStorage.getItem('tpo_jwt');
    const formData = new FormData();
    formData.append('certificates', file);
    
    fetch(`${API_BASE}/api/student/me/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        alert('Certificates uploaded successfully!');
    })
    .catch(error => {
        console.error('Error uploading certificates:', error);
        alert('Failed to upload certificates. Please try again.');
    });
}

// Setup wellness sliders
function setupWellnessSliders() {
    const sliders = [
        { id: 'wlStudy', suffix: 'h' },
        { id: 'wlBreaks', suffix: '' },
        { id: 'wlSleep', suffix: 'h' },
        { id: 'wlLoad', suffix: '' }
    ];
    
    sliders.forEach(slider => {
        const input = document.getElementById(slider.id);
        const display = document.getElementById(slider.id + 'Val');
        
        if (input && display) {
            input.addEventListener('input', function() {
                display.textContent = this.value + slider.suffix;
            });
        }
    });
}

// Analyze wellness
function analyzeWellness(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('tpo_jwt');
    
    const wellnessData = {
        study_hours: parseFloat(document.getElementById('wlStudy').value),
        breaks: parseInt(document.getElementById('wlBreaks').value),
        sleep_duration: parseFloat(document.getElementById('wlSleep').value),
        mental_load: parseInt(document.getElementById('wlLoad').value)
    };
    
    fetch(`${API_BASE}/api/fatigue/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(wellnessData)
    })
    .then(response => response.json())
    .then(data => {
        displayWellnessResult(data);
        loadWellnessScore(); // Refresh dashboard
    })
    .catch(error => {
        console.error('Error analyzing wellness:', error);
        alert('Failed to analyze wellness. Please try again.');
    });
}

// Display wellness result
function displayWellnessResult(data) {
    const score = data.score || 5;
    const level = data.level || 'Medium';
    const advice = data.advice || 'Keep maintaining your wellness routine.';
    
    // Update meter
    const meterFill = document.getElementById('fatigueMeter');
    const scoreDisplay = document.getElementById('fatigueScore');
    const adviceDiv = document.getElementById('fatigueAdvice');
    
    // Calculate rotation based on score (0-10 scale)
    const rotation = (score / 10) * 240 - 120; // -120 to +120 degrees
    meterFill.style.transform = `rotate(${rotation}deg)`;
    
    scoreDisplay.textContent = score;
    
    // Update advice
    adviceDiv.className = `alert ${level === 'High' ? 'alert-danger' : level === 'Medium' ? 'alert-warning' : 'alert-success'}`;
    adviceDiv.innerHTML = `
        <i class="fas fa-${level === 'High' ? 'exclamation-triangle' : level === 'Medium' ? 'exclamation-circle' : 'check-circle'} me-2"></i>
        <strong>Fatigue Level: ${level}</strong><br>
        ${advice}
    `;
}

// Load wellness score for dashboard
function loadWellnessScore() {
    const token = localStorage.getItem('tpo_jwt');
    
    // Get latest wellness data
    fetch(`${API_BASE}/api/fatigue-data/`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.length > 0) {
            const latest = data[0];
            document.getElementById('wellnessScore').textContent = latest.fatigue_score <= 3 ? 'Excellent' : latest.fatigue_score <= 6 ? 'Good' : 'Needs Attention';
        }
    })
    .catch(error => {
        console.error('Error loading wellness score:', error);
    });
}

// Toggle sidebar for mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('show');
}

// Apply to job
function applyToJob(jobId) {
    const token = localStorage.getItem('tpo_jwt');
    
    // Check if already applied
    const existingApplication = applicationsData?.find(app => app.job.id === jobId);
    if (existingApplication) {
        alert('You have already applied to this job!');
        return;
    }
    
    // Show application modal
    showApplicationModal(jobId);
}

// Show application modal
function showApplicationModal(jobId) {
    const job = jobsData.find(j => j.id === jobId);
    if (!job) return;
    
    const modalHtml = `
        <div class="modal fade" id="applicationModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Apply for ${job.role}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Company</label>
                            <input type="text" class="form-control" value="${job.company_name}" readonly>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Role</label>
                            <input type="text" class="form-control" value="${job.role}" readonly>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Cover Letter (Optional)</label>
                            <textarea class="form-control" id="coverLetter" rows="4" placeholder="Tell us why you're interested in this role..."></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Resume (Optional)</label>
                            <input type="file" class="form-control" id="resumeFile" accept=".pdf,.doc,.docx">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Personal Notes</label>
                            <textarea class="form-control" id="applicationNotes" rows="2" placeholder="Add your personal notes..."></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="submitApplication(${jobId})">Submit Application</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('applicationModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('applicationModal'));
    modal.show();
}

// Submit application
function submitApplication(jobId) {
    const token = localStorage.getItem('tpo_jwt');
    const coverLetter = document.getElementById('coverLetter').value;
    const notes = document.getElementById('applicationNotes').value;
    const resumeFile = document.getElementById('resumeFile').files[0];
    
    const formData = new FormData();
    formData.append('job_id', jobId);
    formData.append('cover_letter', coverLetter);
    formData.append('notes', notes);
    if (resumeFile) {
        formData.append('resume', resumeFile);
    }
    
    fetch(`${API_BASE}/api/applications/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('applicationModal'));
        modal.hide();
        
        // Show success message
        alert('Application submitted successfully!');
        
        // Refresh applications list
        loadApplications();
        
        // Update job display to show applied status
        loadJobs();
    })
    .catch(error => {
        console.error('Application error:', error);
        alert('Failed to submit application. Please try again.');
    });
}

// Load applications
function loadApplications(isDashboard = false) {
    const token = localStorage.getItem('tpo_jwt');
    
    fetch(`${API_BASE}/api/applications/`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(applications => {
        applicationsData = applications;
        
        // Update dashboard stats if on dashboard
        if (isDashboard) {
            document.getElementById('appliedCount').textContent = applications.length;
        }
        
        // Only render if on applications page
        if (!isDashboard) {
            renderApplications(applications);
        }
    })
    .catch(error => {
        console.error('Error loading applications:', error);
        if (!isDashboard) {
            document.getElementById('applicationsList').innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Unable to load applications. Please try again later.
                </div>
            `;
        }
    });
}

// Render applications
function renderApplications(applications) {
    const container = document.getElementById('applicationsList');
    
    if (applications.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fas fa-paper-plane fa-3x mb-3"></i>
                <p>You haven't applied to any jobs yet.</p>
                <a href="#" onclick="showSection('jobs')" class="btn btn-primary">Browse Jobs</a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = applications.map(app => `
        <div class="application-card">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                    <h6 class="application-title">${app.job.role}</h6>
                    <p class="application-company">${app.job.company_name}</p>
                    <span class="badge ${getStatusBadgeClass(app.status)}">${getStatusText(app.status)}</span>
                </div>
                <div class="application-actions">
                    <button class="btn btn-sm btn-outline-primary" onclick="viewApplicationDetails(${app.id})">
                        <i class="fas fa-eye me-1"></i>Details
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="editApplication(${app.id})">
                        <i class="fas fa-edit me-1"></i>Edit
                    </button>
                    ${app.status === 'applied' ? `
                    <button class="btn btn-sm btn-outline-danger" onclick="withdrawApplication(${app.id})">
                        <i class="fas fa-times me-1"></i>Withdraw
                    </button>
                    ` : ''}
                </div>
            </div>
            <div class="application-meta">
                <div class="meta-item">
                    <i class="fas fa-calendar"></i>
                    <span>Applied: ${new Date(app.applied_at).toLocaleDateString()}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-clock"></i>
                    <span>Updated: ${new Date(app.updated_at).toLocaleDateString()}</span>
                </div>
                ${app.resume ? `
                <div class="meta-item">
                    <i class="fas fa-file"></i>
                    <span>Resume uploaded</span>
                </div>
                ` : ''}
            </div>
            ${app.cover_letter ? `
            <div class="application-notes">
                <small class="text-muted">${app.cover_letter.substring(0, 100)}${app.cover_letter.length > 100 ? '...' : ''}</small>
            </div>
            ` : ''}
        </div>
    `).join('');
}

// Get status badge class
function getStatusBadgeClass(status) {
    const statusClasses = {
        'applied': 'bg-primary',
        'under_review': 'bg-warning',
        'shortlisted': 'bg-info',
        'interview_scheduled': 'bg-success',
        'selected': 'bg-success',
        'rejected': 'bg-danger',
        'withdrawn': 'bg-secondary'
    };
    return statusClasses[status] || 'bg-secondary';
}

// Get status text
function getStatusText(status) {
    const statusTexts = {
        'applied': 'Applied',
        'under_review': 'Under Review',
        'shortlisted': 'Shortlisted',
        'interview_scheduled': 'Interview Scheduled',
        'selected': 'Selected',
        'rejected': 'Rejected',
        'withdrawn': 'Withdrawn'
    };
    return statusTexts[status] || status;
}

// View application details
function viewApplicationDetails(applicationId) {
    const application = applicationsData.find(app => app.id === applicationId);
    if (!application) return;
    
    alert(`Application Details:\n\nCompany: ${application.job.company_name}\nRole: ${application.job.role}\nStatus: ${getStatusText(application.status)}\nApplied: ${new Date(application.applied_at).toLocaleDateString()}\nUpdated: ${new Date(application.updated_at).toLocaleDateString()}\n\n${application.cover_letter ? 'Cover Letter:\n' + application.cover_letter : ''}\n\n${application.notes ? 'Notes:\n' + application.notes : ''}`);
}

// Edit application
function editApplication(applicationId) {
    const application = applicationsData.find(app => app.id === applicationId);
    if (!application) return;
    
    const newNotes = prompt('Update your notes:', application.notes || '');
    if (newNotes !== null) {
        updateApplication(applicationId, { notes: newNotes });
    }
}

// Withdraw application
function withdrawApplication(applicationId) {
    if (!confirm('Are you sure you want to withdraw this application?')) {
        return;
    }
    
    updateApplication(applicationId, { status: 'withdrawn' });
}

// Update application
function updateApplication(applicationId, data) {
    const token = localStorage.getItem('tpo_jwt');
    
    fetch(`${API_BASE}/api/applications/${applicationId}/`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        // Refresh applications list
        loadApplications();
        alert('Application updated successfully!');
    })
    .catch(error => {
        console.error('Update error:', error);
        alert('Failed to update application. Please try again.');
    });
}

// Load trainings
function loadTrainings() {
    const token = localStorage.getItem('tpo_jwt');
    
    fetch(`${API_BASE}/api/trainings/`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(trainings => {
        trainingsData = trainings;
        renderTrainings(trainings);
    })
    .catch(error => {
        console.error('Error loading trainings:', error);
        document.getElementById('trainingsList').innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Unable to load trainings. Please try again later.
            </div>
        `;
    });
}

// Render trainings
function renderTrainings(trainings) {
    const container = document.getElementById('trainingsList');
    
    if (trainings.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fas fa-chalkboard-teacher fa-3x mb-3"></i>
                <p>No upcoming trainings available at the moment.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = trainings.map(training => `
        <div class="training-card">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                    <h6 class="training-title">${training.title}</h6>
                    <p class="training-instructor">
                        <i class="fas fa-user-tie me-1"></i>${training.instructor}
                    </p>
                    <span class="badge ${getTrainingTypeBadgeClass(training.training_type)}">${getTrainingTypeText(training.training_type)}</span>
                    ${training.is_online ? '<span class="badge bg-info">Online</span>' : ''}
                    ${training.is_full ? '<span class="badge bg-danger">Full</span>' : '<span class="badge bg-success">Available</span>'}
                </div>
                <div class="training-actions">
                    <button class="btn btn-sm btn-primary" onclick="viewTrainingDetails(${training.id})" ${training.is_full ? 'disabled' : ''}>
                        <i class="fas fa-eye me-1"></i>Details
                    </button>
                    ${!training.is_full ? `
                    <button class="btn btn-sm btn-success" onclick="registerForTraining(${training.id})">
                        <i class="fas fa-user-plus me-1"></i>Register
                    </button>
                    ` : ''}
                </div>
            </div>
            <div class="training-meta">
                <div class="meta-item">
                    <i class="fas fa-calendar"></i>
                    <span>Start: ${new Date(training.start_date).toLocaleDateString()}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-clock"></i>
                    <span>Duration: ${training.duration_hours} hours</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${training.is_online ? 'Online' : training.venue}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-users"></i>
                    <span>${training.registered_count}/${training.capacity} registered</span>
                </div>
            </div>
            ${training.description ? `
            <div class="training-description">
                <p class="text-muted">${training.description.substring(0, 200)}${training.description.length > 200 ? '...' : ''}</p>
            </div>
            ` : ''}
            ${training.prerequisites ? `
            <div class="training-prerequisites">
                <small class="text-muted">
                    <strong>Prerequisites:</strong> ${training.prerequisites}
                </small>
            </div>
            ` : ''}
            ${training.learning_outcomes ? `
            <div class="training-outcomes">
                <small class="text-muted">
                    <strong>Learning Outcomes:</strong> ${training.learning_outcomes}
                </small>
            </div>
            ` : ''}
        </div>
    `).join('');
}

// Get training type badge class
function getTrainingTypeBadgeClass(type) {
    const typeClasses = {
        'technical': 'bg-primary',
        'soft_skills': 'bg-success',
        'aptitude': 'bg-info',
        'interview': 'bg-warning',
        'workshop': 'bg-secondary',
        'certification': 'bg-danger',
        'other': 'bg-dark'
    };
    return typeClasses[type] || 'bg-secondary';
}

// Get training type text
function getTrainingTypeText(type) {
    const typeTexts = {
        'technical': 'Technical Skills',
        'soft_skills': 'Soft Skills',
        'aptitude': 'Aptitude Training',
        'interview': 'Interview Preparation',
        'workshop': 'Workshop',
        'certification': 'Certification',
        'other': 'Other'
    };
    return typeTexts[type] || type;
}

// View training details
function viewTrainingDetails(trainingId) {
    const training = trainingsData.find(t => t.id === trainingId);
    if (!training) return;
    
    const startDate = new Date(training.start_date).toLocaleString();
    const endDate = new Date(training.end_date).toLocaleString();
    const statusText = training.is_full ? 'Full' : 'Available';
    const statusClass = training.is_full ? 'danger' : 'success';
    
    alert(`Training Details:\n\nTitle: ${training.title}\nType: ${getTrainingTypeText(training.training_type)}\nInstructor: ${training.instructor}\nDuration: ${training.duration_hours} hours\nStart: ${startDate}\nEnd: ${endDate}\nVenue: ${training.is_online ? 'Online' : training.venue}\nCapacity: ${training.capacity}\nRegistered: ${training.registered_count}\nStatus: ${statusText}\n\n${training.description ? 'Description:\n' + training.description : ''}\n\n${training.prerequisites ? 'Prerequisites:\n' + training.prerequisites : ''}\n\n${training.learning_outcomes ? 'Learning Outcomes:\n' + training.learning_outcomes : ''}`);
}

// Register for training
function registerForTraining(trainingId) {
    const token = localStorage.getItem('tpo_jwt');
    
    // Check if already registered
    const existingRegistration = myTrainingsData?.find(reg => reg.training.id === trainingId);
    if (existingRegistration) {
        alert('You have already registered for this training!');
        return;
    }
    
    const training = trainingsData.find(t => t.id === trainingId);
    if (!training) return;
    
    if (training.is_full) {
        alert('This training is already full!');
        return;
    }
    
    const notes = prompt('Add any notes for this training (optional):', '');
    if (notes === null) return;
    
    fetch(`${API_BASE}/api/trainings/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            training_id: trainingId,
            notes: notes
        })
    })
    .then(response => response.json())
    .then(data => {
        alert('Registration successful!');
        loadTrainings();
        loadMyTrainings(); // Refresh my trainings
    })
    .catch(error => {
        console.error('Registration error:', error);
        alert('Failed to register for training. Please try again.');
    });
}

// Load my trainings
function loadMyTrainings() {
    const token = localStorage.getItem('tpo_jwt');
    
    fetch(`${API_BASE}/api/my-trainings/`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(registrations => {
        myTrainingsData = registrations;
    })
    .catch(error => {
        console.error('Error loading my trainings:', error);
    });
}

// Load resume analyses
function loadResumeAnalyses() {
    const token = localStorage.getItem('tpo_jwt');
    
    fetch(`${API_BASE}/api/resume-analysis/`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(analyses => {
        resumeAnalysesData = analyses;
        renderResumeAnalyses(analyses);
    })
    .catch(error => {
        console.error('Error loading resume analyses:', error);
        document.getElementById('resumeAnalysesList').innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Unable to load resume analyses. Please try again later.
            </div>
        `;
    });
}

// Render resume analyses
function renderResumeAnalyses(analyses) {
    const container = document.getElementById('resumeAnalysesList');
    
    if (analyses.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fas fa-file-alt fa-3x mb-3"></i>
                <p>No resume analyses yet. Upload your resume to get started!</p>
                <button class="btn btn-primary" onclick="document.getElementById('resumeFileInput').click()">
                    <i class="fas fa-upload me-1"></i>Upload Resume
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = analyses.map(analysis => `
        <div class="analysis-card">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                    <h6 class="analysis-title">Analysis #${analysis.id}</h6>
                    <p class="analysis-date">${new Date(analysis.analysis_date).toLocaleDateString()}</p>
                    <div class="analysis-scores">
                        <span class="score-badge ${getScoreClass(analysis.overall_score)}">${analysis.overall_score}/10</span>
                        <span class="grade-badge ${getGradeClass(analysis.grade)}">${analysis.grade}</span>
                    </div>
                </div>
                <div class="analysis-actions">
                    <button class="btn btn-sm btn-primary" onclick="viewAnalysisDetails(${analysis.id})">
                        <i class="fas fa-eye me-1"></i>Details
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAnalysis(${analysis.id})">
                        <i class="fas fa-trash me-1"></i>Delete
                    </button>
                </div>
            </div>
            <div class="analysis-meta">
                <div class="meta-item">
                    <i class="fas fa-chart-bar"></i>
                    <span>ATS Score: ${analysis.ats_score}/10</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-file-alt"></i>
                    <span>Structure: ${analysis.structure_score}/10</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-edit"></i>
                    <span>Content: ${analysis.content_score}/10</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-code"></i>
                    <span>Skills: ${analysis.skills_match}/10</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-briefcase"></i>
                    <span>Experience: ${analysis.experience_score}/10</span>
                </div>
            </div>
            ${analysis.resume_file ? `
            <div class="analysis-resume">
                <small class="text-muted">
                    <i class="fas fa-file me-1"></i>
                    <a href="${analysis.resume_file}" target="_blank" class="text-primary">View Resume</a>
                </small>
            </div>
            ` : ''}
        </div>
    `).join('');
}

// Get score class
function getScoreClass(score) {
    if (score >= 8) return 'bg-success';
    if (score >= 6) return 'bg-warning';
    if (score >= 4) return 'bg-danger';
    return 'bg-secondary';
}

// Get grade class
function getGradeClass(grade) {
    if (grade.includes('A')) return 'bg-success';
    if (grade.includes('B')) return 'bg-warning';
    if (grade.includes('C')) return 'bg-danger';
    return 'bg-secondary';
}

// View analysis details
function viewAnalysisDetails(analysisId) {
    const analysis = resumeAnalysesData.find(a => a.id === analysisId);
    if (!analysis) return;
    
    const details = `
Analysis Details:
============================
Overall Score: ${analysis.overall_score}/10 (${analysis.grade})
ATS Score: ${analysis.ats_score}/10
Structure Score: ${analysis.structure_score}/10
Content Score: ${analysis.content_score}/10
Skills Match: ${analysis.skills_match}/10
Experience Score: ${analysis.experience_score}/10

Analysis Date: ${new Date(analysis.analysis_date).toLocaleDateString()}

Strengths:
${analysis.strengths}

Weaknesses:
${analysis.weaknesses}

Suggestions:
${analysis.suggestions}

Key Skills Found:
${analysis.key_skills_found}

Missing Skills:
${analysis.missing_skills}
    `;
    
    alert(details);
}

// Delete analysis
function deleteAnalysis(analysisId) {
    if (!confirm('Are you sure you want to delete this analysis?')) {
        return;
    }
    
    const token = localStorage.getItem('tpo_jwt');
    
    fetch(`${API_BASE}/api/resume-analysis/${analysisId}/`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            alert('Analysis deleted successfully!');
            loadResumeAnalyses();
        } else {
            alert('Failed to delete analysis. Please try again.');
        }
    })
    .catch(error => {
        console.error('Delete error:', error);
        alert('Failed to delete analysis. Please try again.');
    });
}

// Setup resume upload
function setupResumeUpload() {
    const dropZone = document.getElementById('resumeDropZone');
    const fileInput = document.getElementById('resumeFileInput');
    
    if (!dropZone || !fileInput) return;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    // Handle drag and drop
    dropZone.addEventListener('drop', handleDrop);
    dropZone.addEventListener('dragover', highlight);
    dropZone.addEventListener('dragleave', unhighlight);
    
    // Handle file selection
    fileInput.addEventListener('change', handleFileSelect);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    dropZone.classList.add('highlight');
}

function unhighlight(e) {
    dropZone.classList.remove('highlight');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFile(file) {
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.txt')) {
        alert('Please upload a valid resume file (PDF, DOC, DOCX, or TXT)');
        return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
    }
    
    uploadResume(file);
}

function uploadResume(file) {
    const token = localStorage.getItem('tpo_jwt');
    const formData = new FormData();
    formData.append('resume_file', file);
    
    fetch(`${API_BASE}/api/resume-analysis/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        alert('Resume uploaded successfully! Analysis will begin shortly.');
        loadResumeAnalyses();
    })
    .catch(error => {
        console.error('Upload error:', error);
        alert('Failed to upload resume. Please try again.');
    });
}

// Utility functions
function showToast(message, type = 'info') {
    // Create toast notification (placeholder implementation)
    console.log(`Toast (${type}): ${message}`);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString();
}
