// Configuration - Load from config.js
const API_URL = window.RAG_CONFIG?.API_URL || 'http://localhost:8000';
const COLLECTION_NAME = window.RAG_CONFIG?.COLLECTION_NAME || 'learning_materials';

// Load topics on page load
document.addEventListener('DOMContentLoaded', function() {
    loadTopics();
    
    // Close dropdown menus when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.topic-menu')) {
            document.querySelectorAll('.topic-menu-dropdown.active').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    });
});

async function loadTopics() {
    try {
        const response = await fetch(`${API_URL}/topics?collection_name=${COLLECTION_NAME}`);
        if (!response.ok) {
            console.error('Failed to load topics:', response.statusText);
            return;
        }
        
        const data = await response.json();
        const topicsList = document.getElementById('topics-list');
        
        if (!topicsList) {
            console.error('Topics list element not found');
            return;
        }
        
        if (data.topics.length === 0) {
            topicsList.innerHTML = '<p class="no-topics">No topics yet. Add documents to get started!</p>';
            return;
        }
        
        topicsList.innerHTML = data.topics.map(topic => `
            <li class="topic-item" onclick="toggleTopicItem(event, this, '${topic.name}')">
                <span class="topic-name">${topic.name}</span>
                <span class="topic-count">${topic.document_count} doc${topic.document_count !== 1 ? 's' : ''}</span>
                <div class="topic-menu">
                    <button class="topic-menu-btn" onclick="toggleTopicMenu(event, this)" title="More options">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </button>
                    <div class="topic-menu-dropdown">
                        <button onclick="event.stopPropagation(); editTopic(this)">
                            <img src="assets/icons/edit.svg" alt="Edit" width="16" height="16">
                            Edit
                        </button>
                        <button onclick="event.stopPropagation(); deleteTopic(this, '${topic.name}')" class="delete-btn">
                            <img src="assets/icons/delete.svg" alt="Delete" width="16" height="16">
                            Delete
                        </button>
                    </div>
                </div>
            </li>
        `).join('');
    } catch (error) {
        console.error('Error loading topics:', error);
        const topicsList = document.getElementById('topics-list');
        if (topicsList) {
            topicsList.innerHTML = '<p class="error-message">Failed to load topics. Please check your connection.</p>';
        }
    }
}

function toggleSidebar() {
    const aside = document.querySelector('aside');
    const hamburger = document.querySelector('.hamburger-icon');
    aside.classList.toggle('active');
    hamburger.classList.toggle('active');
}

function toggleTopicItem(event, element, topicName) {
    // Don't toggle if clicking on menu button or dropdown
    if (event.target.closest('.topic-menu')) {
        return;
    }
    element.classList.toggle('active');
}

function toggleTopicMenu(event, button) {
    event.stopPropagation();
    
    // Close all other open menus
    document.querySelectorAll('.topic-menu-dropdown.active').forEach(menu => {
        if (menu !== button.nextElementSibling) {
            menu.classList.remove('active');
        }
    });
    
    // Toggle current menu
    const dropdown = button.nextElementSibling;
    dropdown.classList.toggle('active');
}

function editTopic(button) {
    const topicItem = button.closest('.topic-item');
    const topicName = topicItem.querySelector('.topic-name').textContent;
    
    // Close dropdown
    button.closest('.topic-menu-dropdown').classList.remove('active');
    
    // Open modal
    openTopicModal(topicItem, topicName);
}

function uploadFiles(button) {
    const topicItem = button.closest('.topic-item');
    const topicName = topicItem.querySelector('.topic-name').textContent;
    
    // Close dropdown
    button.closest('.topic-menu-dropdown').classList.remove('active');
    
    // Open modal
    openTopicModal(topicItem, topicName);
}

function openNewTopicModal() {
    // Create modal for new topic
    const modal = document.createElement('div');
    modal.className = 'topic-modal';
    modal.innerHTML = `
        <div class="topic-modal-content">
            <div class="topic-modal-header">
                <h2>Create New Topic</h2>
                <button class="modal-close" onclick="closeTopicModal()">&times;</button>
            </div>
            <div class="topic-modal-body">
                <div class="form-group">
                    <label>Topic Name *</label>
                    <input type="text" class="topic-name-input" placeholder="e.g., Machine Learning, Python Programming" autofocus>
                </div>
                <div class="form-group">
                    <label>Upload Documents</label>
                    <div class="upload-area" id="uploadArea">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <p>Click to upload or drag and drop</p>
                        <p class="upload-hint">PDF, TXT, or Markdown files</p>
                        <input type="file" id="fileInput" accept=".pdf,.txt,.text,.md,.markdown" multiple style="display: none;">
                    </div>
                    <div class="upload-progress" id="uploadProgress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progressFill"></div>
                        </div>
                        <div class="progress-text" id="progressText">Uploading...</div>
                    </div>
                    <div class="files-list" id="filesList">
                        <!-- Selected files will appear here -->
                    </div>
                </div>
            </div>
            <div class="topic-modal-footer">
                <button class="btn-secondary" onclick="closeTopicModal()">Cancel</button>
                <button class="btn-primary" onclick="createNewTopic()">Create & Upload</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Show modal
    setTimeout(() => modal.classList.add('active'), 10);
    
    // Add input listener for topic name changes after upload
    const topicInput = modal.querySelector('.topic-name-input');
    topicInput.addEventListener('input', () => {
        if (modal._createdTopicName) {
            const createBtn = modal.querySelector('.btn-primary');
            if (topicInput.value.trim() !== modal._createdTopicName && topicInput.value.trim() !== '') {
                createBtn.disabled = false;
            } else {
                createBtn.disabled = true;
            }
        }
    });
    
    // Setup file upload area
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const filesList = document.getElementById('filesList');
    let selectedFiles = [];
    
    // Initialize modal properties
    modal._selectedFiles = selectedFiles;
    
    // Click to upload
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files).filter(f => {
            const extension = f.name.toLowerCase().split('.').pop();
            return ['pdf', 'txt', 'text', 'md', 'markdown'].includes(extension);
        });
        
        if (files.length === 0 && e.target.files.length > 0) {
            alert('Please select only PDF, TXT, or Markdown files');
            return;
        }
        
        handleFilesSelect(files);
        // Reset file input to allow selecting the same file again
        e.target.value = '';
    });
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files).filter(f => {
            const extension = f.name.toLowerCase().split('.').pop();
            return ['pdf', 'txt', 'text', 'md', 'markdown'].includes(extension);
        });
        
        if (files.length === 0 && e.dataTransfer.files.length > 0) {
            alert('Please select only PDF, TXT, or Markdown files');
            return;
        }
        
        handleFilesSelect(files);
    });
    
    function handleFilesSelect(files) {
        selectedFiles = [...selectedFiles, ...files];
        modal._selectedFiles = selectedFiles;
        displaySelectedFiles();
    }
    
    function displaySelectedFiles() {
        const filesToDisplay = modal._selectedFiles || selectedFiles;
        if (filesToDisplay.length === 0) {
            filesList.innerHTML = '';
            return;
        }
        
        filesList.innerHTML = filesToDisplay.map((file, index) => {
            let fileSize = (file.size / 1024).toFixed(2) + ' KB';
            if (file.size > 1024 * 1024) {
                fileSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
            }
            return `
                <div class="file-item" data-index="${index}">
                    <div class="file-info">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                            <polyline points="13 2 13 9 20 9"></polyline>
                        </svg>
                        <div class="file-details">
                            <span class="file-name">${file.name}</span>
                            <span class="file-meta">${fileSize}</span>
                        </div>
                    </div>
                    <button class="file-remove-btn" onclick="removeFileFromUpload(${index})" title="Remove file">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');
    }
    
    // Store display function on modal
    modal._displaySelectedFiles = displaySelectedFiles;
}

function removeFileFromUpload(index) {
    const modal = document.querySelector('.topic-modal');
    if (modal && modal._selectedFiles && modal._displaySelectedFiles) {
        modal._selectedFiles.splice(index, 1);
        modal._displaySelectedFiles();
    }
}

async function createNewTopic() {
    console.log('createNewTopic called');
    const modal = document.querySelector('.topic-modal');
    console.log('modal:', modal);
    const topicName = modal.querySelector('.topic-name-input').value.trim();
    console.log('topicName:', topicName);
    
    // Check if this is a rename operation (after initial upload)
    if (modal._createdTopicName) {
        // This is a rename operation
        await renameCreatedTopic();
        return;
    }
    
    const files = modal._selectedFiles || [];
    console.log('files:', files, 'length:', files.length);
    
    if (!topicName) {
        alert('Please enter a topic name');
        return;
    }
    
    if (files.length === 0) {
        alert('Please select at least one file to upload');
        return;
    }
    
    // Show progress bar and hide upload area
    const uploadArea = document.getElementById('uploadArea');
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const filesList = document.getElementById('filesList');
    
    uploadArea.style.display = 'none';
    filesList.style.display = 'none';
    uploadProgress.style.display = 'block';
    
    // Disable buttons
    const createBtn = modal.querySelector('.btn-primary');
    const cancelBtn = modal.querySelector('.btn-secondary');
    createBtn.disabled = true;
    cancelBtn.disabled = true;
    createBtn.textContent = 'Uploading...';
    
    try {
        // Upload each file
        let successCount = 0;
        let failCount = 0;
        const failedFiles = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('topic', topicName);
            formData.append('collection_name', COLLECTION_NAME);
            
            // Update progress
            const progress = ((i) / files.length) * 100;
            progressFill.style.width = progress + '%';
            progressText.textContent = `Uploading ${i + 1}/${files.length}: ${file.name}`;
            
            try {
                const response = await fetch(`${API_URL}/index/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    successCount++;
                } else {
                    failCount++;
                    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                    failedFiles.push({ name: file.name, error: errorData.detail });
                    console.error(`Failed to upload ${file.name}:`, errorData);
                }
            } catch (error) {
                failCount++;
                failedFiles.push({ name: file.name, error: error.message });
                console.error(`Error uploading ${file.name}:`, error);
            }
        }
        
        // Complete progress
        progressFill.style.width = '100%';
        progressText.textContent = 'Upload complete! You can close this window.';
        
        // Reload topics to show the new topic
        loadTopics();
        
        // Store the topic name for potential renaming
        modal._createdTopicName = topicName;
        
        // Reset Create button to be re-enabled when name changes
        createBtn.disabled = true;
        createBtn.textContent = 'Save Changes';
        cancelBtn.disabled = false;
        cancelBtn.textContent = 'Close';
        
        // Only show alert if there were failures
        if (failCount > 0) {
            let message = `${successCount} file(s) uploaded successfully.`;
            message += `\n\n${failCount} file(s) failed:\n` + 
                failedFiles.map(f => `- ${f.name}: ${f.error}`).join('\n');
            alert(message);
        }
        // If all failed, show error
        if (successCount === 0) {
            alert('Failed to upload files:\n\n' + 
                failedFiles.map(f => `- ${f.name}: ${f.error}`).join('\n') + 
                '\n\nPlease check that your files are valid PDF, TXT, or Markdown files.');
        }
    } catch (error) {
        console.error('Error creating topic:', error);
        alert('An error occurred while creating the topic: ' + error.message);
        
        // Reset UI on error
        uploadProgress.style.display = 'none';
        uploadArea.style.display = 'flex';
        filesList.style.display = 'block';
        createBtn.disabled = false;
        createBtn.textContent = 'Create & Upload';
        cancelBtn.disabled = false;
    }
}

async function renameCreatedTopic() {
    const modal = document.querySelector('.topic-modal');
    const newTopicName = modal.querySelector('.topic-name-input').value.trim();
    const oldTopicName = modal._createdTopicName;
    
    if (!newTopicName) {
        alert('Please enter a topic name');
        return;
    }
    
    if (newTopicName === oldTopicName) {
        // No change, just close
        closeTopicModal();
        return;
    }
    
    const saveBtn = modal.querySelector('.btn-primary');
    const originalText = saveBtn.textContent;
    
    saveBtn.disabled = true;
    saveBtn.textContent = 'Renaming...';
    
    try {
        const response = await fetch(
            `${API_URL}/topics/${encodeURIComponent(oldTopicName)}?new_name=${encodeURIComponent(newTopicName)}&collection_name=${COLLECTION_NAME}`,
            { method: 'PUT' }
        );
        
        if (response.ok) {
            const data = await response.json();
            modal._createdTopicName = newTopicName;
            closeTopicModal();
            loadTopics();
            if (data.updated_count > 0) {
                console.log(`Topic renamed: ${data.updated_count} chunks updated`);
            }
        } else {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            alert(`Failed to rename topic: ${error.detail}`);
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    } catch (error) {
        console.error('Error renaming topic:', error);
        alert('Error renaming topic: ' + error.message);
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

function openTopicModal(topicItem, topicName) {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'topic-modal';
    modal.innerHTML = `
        <div class="topic-modal-content">
            <div class="topic-modal-header">
                <h2>Edit Topic</h2>
                <button class="modal-close" onclick="closeTopicModal()">&times;</button>
            </div>
            <div class="topic-modal-body">
                <div class="form-group">
                    <label>Topic Name</label>
                    <input type="text" class="topic-name-input" value="${topicName}" placeholder="Enter topic name">
                </div>
                <div class="form-group">
                    <label>Files</label>
                    <div class="pending-files-hint" id="pendingHint" style="display: none;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        New file(s) selected. Click "Upload Files" to upload.
                    </div>
                    <div class="upload-progress" id="uploadProgress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill" id="editProgressFill"></div>
                        </div>
                        <div class="progress-text" id="progressText">Uploading...</div>
                    </div>
                    <div class="files-list" id="filesList">
                        <!-- Files will be added here dynamically -->
                    </div>
                    <button class="add-file-btn" id="addFileBtn" onclick="selectFilesToAdd()">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add Files
                    </button>
                </div>
            </div>
            <div class="topic-modal-footer">
                <button class="btn-secondary" onclick="closeTopicModal()">Cancel</button>
                <button class="btn-primary" onclick="saveTopicChanges('${topicName}')" disabled>Save Changes</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Store modal reference globally for file selection
    window._currentEditModal = modal;
    
    // Store original topic name for comparison
    modal._originalTopicName = topicName;
    
    // Add listener to topic name input to detect changes
    const topicNameInput = modal.querySelector('.topic-name-input');
    if (topicNameInput) {
        topicNameInput.addEventListener('input', () => {
            checkForChanges(modal);
        });
    }
    
    // Load existing files (sample data)
    loadTopicFiles(topicName);
    
    // Show modal
    setTimeout(() => modal.classList.add('active'), 10);
}

function checkForChanges(modal) {
    if (!modal) return;
    
    const topicNameInput = modal.querySelector('.topic-name-input');
    const currentName = topicNameInput ? topicNameInput.value.trim() : '';
    const originalName = modal._originalTopicName || '';
    const nameChanged = currentName !== originalName && currentName !== '';
    const hasPendingFiles = modal._pendingFiles && modal._pendingFiles.length > 0;
    
    const saveBtn = modal.querySelector('.btn-primary');
    if (saveBtn) {
        // Enable button if name changed OR files pending
        saveBtn.disabled = !nameChanged && !hasPendingFiles;
    }
}

function loadTopicFiles(topicName) {
    const filesList = document.getElementById('filesList');
    filesList.innerHTML = '<p class="loading">Loading files...</p>';
    
    // Fetch actual files from backend
    fetch(`${API_URL}/topics/${encodeURIComponent(topicName)}/files?collection_name=${COLLECTION_NAME}`)
        .then(response => response.json())
        .then(data => {
            const files = data.files || [];
            
            if (files.length === 0) {
                filesList.innerHTML = '<p class="no-files">No files uploaded yet</p>';
            } else {
                filesList.innerHTML = files.map(file => `
                    <div class="file-item" data-filename="${file.filename}">
                        <div class="file-info">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                                <polyline points="13 2 13 9 20 9"></polyline>
                            </svg>
                            <div class="file-details">
                                <span class="file-name">${file.filename}</span>
                                <span class="file-meta">${file.chunk_count} chunks • ${new Date(file.uploaded_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <button class="file-remove-btn" onclick="removeFile(this)" title="Remove file">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                `).join('');
            }
        })
        .catch(error => {
            console.error('Error loading files:', error);
            filesList.innerHTML = '<p class="error-message">Failed to load files</p>';
        });
}

function selectFilesToAdd() {
    console.log('selectFilesToAdd called');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '.pdf,.txt,.text,.md,.markdown';
    
    fileInput.onchange = (e) => {
        console.log('File input changed, files selected:', e.target.files.length);
        const files = Array.from(e.target.files).filter(f => {
            const extension = f.name.toLowerCase().split('.').pop();
            return ['pdf', 'txt', 'text', 'md', 'markdown'].includes(extension);
        });
        
        console.log('Filtered files:', files.length);
        
        if (files.length === 0 && e.target.files.length > 0) {
            alert('Please select only PDF, TXT, or Markdown files');
            return;
        }
        
        if (files.length > 0) {
            console.log('Calling addFilesToList with files:', files.map(f => f.name));
            addFilesToList(files);
        } else {
            console.log('No files to add');
        }
    };
    
    console.log('Triggering file input click');
    fileInput.click();
}

function addFilesToList(files) {
    const filesList = document.getElementById('filesList');
    const modal = window._currentEditModal || document.querySelector('.topic-modal');
    
    if (!modal) {
        console.error('No modal found');
        alert('Error: Modal not found. Please try again.');
        return;
    }
    
    if (!filesList) {
        console.error('No filesList element found');
        alert('Error: File list not found. Please try again.');
        return;
    }
    
    // Initialize pending files array if not exists
    if (!modal._pendingFiles) {
        modal._pendingFiles = [];
    }
    
    // Remove "no files" message or loading message if present
    const noFilesMsg = filesList.querySelector('.no-files');
    const loadingMsg = filesList.querySelector('.loading');
    const errorMsg = filesList.querySelector('.error-message');
    
    if (noFilesMsg) noFilesMsg.remove();
    if (loadingMsg) loadingMsg.remove();
    if (errorMsg) errorMsg.remove();
    
    files.forEach(file => {
        // Store the actual File object for later upload
        modal._pendingFiles.push(file);
        
        let fileSize = (file.size / 1024).toFixed(2) + ' KB';
        if (file.size > 1024 * 1024) {
            fileSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
        }
        
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item pending-upload';
        fileItem.dataset.filename = file.name;
        fileItem.dataset.pending = 'true';
        fileItem.innerHTML = `
            <div class="file-info">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
                <div class="file-details">
                    <span class="file-name">${file.name}</span>
                    <span class="file-meta">${fileSize} • Pending upload</span>
                </div>
            </div>
            <button class="file-remove-btn" onclick="removeFile(this)" title="Remove file">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        
        filesList.appendChild(fileItem);
    });
    
    // Update pending hint and save button
    updatePendingFilesHint(modal);
    
    console.log('Added files for upload:', files.map(f => f.name));
    console.log('Total pending files:', modal._pendingFiles.length);
}

function updatePendingFilesHint(modal) {
    if (!modal) {
        modal = window._currentEditModal || document.querySelector('.topic-modal');
    }
    
    const pendingCount = (modal && modal._pendingFiles) ? modal._pendingFiles.length : 0;
    const pendingHint = document.getElementById('pendingHint');
    const pendingCountSpan = document.getElementById('pendingCount');
    const saveBtn = modal ? modal.querySelector('.btn-primary') : null;
    
    if (pendingCount > 0) {
        if (pendingHint) {
            pendingHint.style.display = 'flex';
        }
        if (pendingCountSpan) {
            pendingCountSpan.textContent = pendingCount;
        }
        if (saveBtn) {
            saveBtn.classList.add('has-pending-files');
            saveBtn.disabled = false;
            saveBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Upload ${pendingCount} File${pendingCount > 1 ? 's' : ''}
            `;
        }
    } else {
        if (pendingHint) {
            pendingHint.style.display = 'none';
        }
        if (saveBtn) {
            saveBtn.classList.remove('has-pending-files');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    }
}

async function removeFile(button) {
    const fileItem = button.closest('.file-item');
    const fileName = fileItem.dataset.filename;
    const isPending = fileItem.dataset.pending === 'true';
    const modal = document.querySelector('.topic-modal');
    const topicName = modal.querySelector('.topic-name-input').value.trim();
    
    if (!confirm(`Remove "${fileName}"?`)) {
        return;
    }
    
    // If it's a pending file, just remove from UI and array
    if (isPending) {
        if (modal && modal._pendingFiles) {
            const index = modal._pendingFiles.findIndex(f => f.name === fileName);
            if (index !== -1) {
                modal._pendingFiles.splice(index, 1);
            }
        }
        fileItem.remove();
        console.log('Removed pending file:', fileName);
    } else {
        // It's an uploaded file, delete from backend
        button.disabled = true;
        button.innerHTML = '<span style="font-size: 12px;">...</span>';
        
        try {
            const response = await fetch(
                `${API_URL}/topics/${encodeURIComponent(topicName)}/files/${encodeURIComponent(fileName)}?collection_name=${COLLECTION_NAME}`,
                { method: 'DELETE' }
            );
            
            if (response.ok) {
                fileItem.remove();
                console.log('Deleted file from backend:', fileName);
                // Reload topics to update counts
                loadTopics();
            } else {
                const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
                alert(`Failed to delete file: ${error.detail}`);
                button.disabled = false;
                button.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                `;
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Error deleting file: ' + error.message);
            button.disabled = false;
            button.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            `;
        }
    }
    
    // Check if list is empty
    const filesList = document.getElementById('filesList');
    if (filesList && filesList.children.length === 0) {
        filesList.innerHTML = '<p class="no-files">No files uploaded yet</p>';
    }
    
    // Update pending files hint and button
    updatePendingFilesHint(modal);
}

function closeTopicModal() {
    const modal = document.querySelector('.topic-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
}

async function saveTopicChanges(oldTopicName) {
    const modal = document.querySelector('.topic-modal');
    const topicName = modal.querySelector('.topic-name-input').value.trim();
    
    if (!topicName) {
        alert('Please enter a topic name');
        return;
    }
    
    // Check if topic name changed
    const topicNameChanged = topicName !== oldTopicName;
    
    // Get pending files to upload
    const pendingFiles = modal._pendingFiles || [];
    
    // If no changes, just close
    if (!topicNameChanged && pendingFiles.length === 0) {
        closeTopicModal();
        return;
    }
    
    // If only topic name changed (no files to upload)
    if (topicNameChanged && pendingFiles.length === 0) {
        const saveBtn = modal.querySelector('.btn-primary');
        const cancelBtn = modal.querySelector('.btn-secondary');
        
        saveBtn.disabled = true;
        saveBtn.textContent = 'Renaming...';
        
        try {
            const response = await fetch(
                `${API_URL}/topics/${encodeURIComponent(oldTopicName)}?new_name=${encodeURIComponent(topicName)}&collection_name=${COLLECTION_NAME}`,
                { method: 'PUT' }
            );
            
            if (response.ok) {
                const data = await response.json();
                closeTopicModal();
                loadTopics();
                // Show success message if multiple chunks updated
                if (data.updated_count > 0) {
                    console.log(`Topic renamed: ${data.updated_count} chunks updated`);
                }
            } else {
                const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
                alert(`Failed to rename topic: ${error.detail}`);
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';
            }
        } catch (error) {
            console.error('Error renaming topic:', error);
            alert('Error renaming topic: ' + error.message);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
        return;
    }
    
    // If topic name changed AND files to upload, rename first then upload
    if (topicNameChanged) {
        const saveBtn = modal.querySelector('.btn-primary');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Renaming topic...';
        
        try {
            const response = await fetch(
                `${API_URL}/topics/${encodeURIComponent(oldTopicName)}?new_name=${encodeURIComponent(topicName)}&collection_name=${COLLECTION_NAME}`,
                { method: 'PUT' }
            );
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
                alert(`Failed to rename topic: ${error.detail}`);
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';
                return;
            }
        } catch (error) {
            console.error('Error renaming topic:', error);
            alert('Error renaming topic: ' + error.message);
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
            return;
        }
    }
    
    console.log('Uploading files to topic:', topicName);
    console.log('Files:', pendingFiles.map(f => f.name));
    
    // Show upload progress and hide file list and add button
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('editProgressFill');
    const progressText = document.getElementById('progressText');
    const filesList = document.getElementById('filesList');
    const addFileBtn = document.getElementById('addFileBtn');
    const pendingHint = document.getElementById('pendingHint');
    
    if (uploadProgress) {
        uploadProgress.style.display = 'block';
    }
    if (filesList) {
        filesList.style.display = 'none';
    }
    if (addFileBtn) {
        addFileBtn.style.display = 'none';
    }
    if (pendingHint) {
        pendingHint.style.display = 'none';
    }
    
    // Disable buttons
    const saveBtn = modal.querySelector('.btn-primary');
    const cancelBtn = modal.querySelector('.btn-secondary');
    saveBtn.disabled = true;
    cancelBtn.disabled = true;
    saveBtn.textContent = 'Uploading...';
    
    try {
        // Upload each pending file
        let successCount = 0;
        let failCount = 0;
        const failedFiles = [];
        
        for (let i = 0; i < pendingFiles.length; i++) {
            const file = pendingFiles[i];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('topic', topicName);
            formData.append('collection_name', COLLECTION_NAME);
            
            // Update progress
            const progress = (i / pendingFiles.length) * 100;
            if (progressFill) {
                progressFill.style.width = progress + '%';
            }
            if (progressText) {
                progressText.textContent = `Uploading ${i + 1}/${pendingFiles.length}: ${file.name}`;
            }
            
            try {
                const response = await fetch(`${API_URL}/index/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    successCount++;
                    // Mark file as uploaded in UI
                    const fileItem = modal.querySelector(`.file-item[data-filename="${file.name}"]`);
                    if (fileItem) {
                        fileItem.classList.remove('pending-upload');
                        fileItem.dataset.pending = 'false';
                        const metaSpan = fileItem.querySelector('.file-meta');
                        if (metaSpan) {
                            metaSpan.textContent = metaSpan.textContent.replace('Pending upload', 'Uploaded');
                        }
                    }
                } else {
                    failCount++;
                    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                    failedFiles.push({ name: file.name, error: errorData.detail });
                    console.error(`Failed to upload ${file.name}:`, errorData);
                }
            } catch (error) {
                failCount++;
                failedFiles.push({ name: file.name, error: error.message });
                console.error(`Error uploading ${file.name}:`, error);
            }
        }
        
        // Complete progress
        if (progressFill) {
            progressFill.style.width = '100%';
        }
        if (progressText) {
            progressText.textContent = 'Upload complete! You can close this window.';
        }
        
        // Clear pending files array after successful upload
        modal._pendingFiles = [];
        
        // Remove pending-upload class from all file items
        const pendingFileItems = modal.querySelectorAll('.file-item.pending-upload');
        pendingFileItems.forEach(item => {
            item.classList.remove('pending-upload');
            item.dataset.pending = 'false';
        });
        
        // Reload topics to update counts
        loadTopics();
        
        // Re-enable close button so user can close manually
        cancelBtn.disabled = false;
        cancelBtn.textContent = 'Close';
        
        // Only show alert if there were failures
        if (failCount > 0) {
            let message = `${successCount} file(s) uploaded successfully.`;
            message += `\n\n${failCount} file(s) failed:\n` + 
                failedFiles.map(f => `- ${f.name}: ${f.error}`).join('\n');
            alert(message);
        }
        // If all failed, show error
        if (successCount === 0) {
            alert('Failed to upload files:\n\n' + 
                failedFiles.map(f => `- ${f.name}: ${f.error}`).join('\n'));
        }
    } catch (error) {
        console.error('Error saving topic changes:', error);
        alert('An error occurred while uploading files: ' + error.message);
        
        // Reset UI
        if (uploadProgress) uploadProgress.style.display = 'none';
        if (filesList) filesList.style.display = 'block';
        if (addFileBtn) addFileBtn.style.display = 'flex';
        if (pendingHint && modal._pendingFiles && modal._pendingFiles.length > 0) {
            pendingHint.style.display = 'flex';
        }
    } finally {
        // Reset button state only if upload wasn't successful
        // (if successful, Close button is already enabled)
        if (saveBtn.disabled) {
            saveBtn.disabled = false;
            cancelBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    }
}

async function deleteTopic(button, topicName) {
    if (!confirm(`Are you sure you want to delete topic "${topicName}" and all its documents?\n\nThis action cannot be undone!`)) {
        button.closest('.topic-menu-dropdown').classList.remove('active');
        return;
    }
    
    // Close dropdown
    button.closest('.topic-menu-dropdown').classList.remove('active');
    
    // Disable button and show loading
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = 'Deleting...';
    
    try {
        const response = await fetch(
            `${API_URL}/topics/${encodeURIComponent(topicName)}?collection_name=${COLLECTION_NAME}`,
            { method: 'DELETE' }
        );
        
        if (response.ok) {
            const data = await response.json();
            // Reload topics to update the list
            loadTopics();
        } else {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            alert(`Failed to delete topic: ${error.detail}`);
            button.disabled = false;
            button.textContent = originalText;
        }
    } catch (error) {
        console.error('Error deleting topic:', error);
        alert('Error deleting topic: ' + error.message);
        button.disabled = false;
        button.textContent = originalText;
    }
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatContainer = document.getElementById('chatContainer');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Hide welcome message on first message
    const welcomeMessage = chatContainer.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.style.display = 'none';
    }
    
    // Get selected topics
    const selectedTopics = Array.from(document.querySelectorAll('.topic-item.active'))
        .map(item => item.querySelector('.topic-name').textContent.trim());
    
    console.log('Selected topics for chat:', selectedTopics);
    
    // Add user message to chat
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user';
    userMessageDiv.textContent = message;
    chatContainer.appendChild(userMessageDiv);
    
    // Scroll to bottom after user message
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Clear input and disable send button
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;
    
    // Add loading message
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant loading';
    loadingDiv.innerHTML = 'Thinking<div class="loading-dots"><span>.</span><span>.</span><span>.</span></div>';
    chatContainer.appendChild(loadingDiv);
    
    // Scroll to bottom after loading message
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    try {
        // Call chat API
        const response = await fetch(`${API_URL}/chat?collection_name=${COLLECTION_NAME}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question: message,
                topics: selectedTopics.length > 0 ? selectedTopics : null,
                limit: 8,
                stream: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Remove loading message
        loadingDiv.remove();
        
        // Add assistant response
        const assistantMessageDiv = document.createElement('div');
        assistantMessageDiv.className = 'message assistant';
        
        if (data.answer) {
            // Convert Markdown to HTML
            assistantMessageDiv.innerHTML = markdownToHtml(data.answer);
            
            // Add sources if available
            if (data.chunks && data.chunks.length > 0) {
                const sourcesDiv = document.createElement('div');
                sourcesDiv.className = 'message-sources';
                sourcesDiv.innerHTML = '<br><small><strong>Quellen:</strong> ' + 
                    [...new Set(data.chunks.map(c => c.metadata.source_file))].join(', ') +
                    '</small>';
                assistantMessageDiv.appendChild(sourcesDiv);
            }
        } else {
            assistantMessageDiv.textContent = 'Entschuldigung, es ist ein Fehler aufgetreten.';
        }
        
        chatContainer.appendChild(assistantMessageDiv);
        
        // Scroll to bottom after adding message
        setTimeout(() => {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 100);
        
    } catch (error) {
        console.error('Error sending message:', error);
        
        // Remove loading message
        loadingDiv.remove();
        
        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message assistant error';
        errorDiv.textContent = '❌ Entschuldigung, es ist ein Fehler aufgetreten. Bitte stelle sicher, dass du Dokumente hochgeladen hast und versuche es erneut.';
        chatContainer.appendChild(errorDiv);
    } finally {
        // Re-enable input and button
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function markdownToHtml(markdown) {
    // Simple Markdown to HTML converter
    let html = markdown;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    
    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Lists (unordered)
    html = html.replace(/^\* (.+)$/gim, '<li>$1</li>');
    html = html.replace(/^- (.+)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Lists (ordered)
    html = html.replace(/^\d+\. (.+)$/gim, '<li>$1</li>');
    
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraph if not already wrapped
    if (!html.startsWith('<')) {
        html = '<p>' + html + '</p>';
    }
    
    return html;
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', function(event) {
    const aside = document.querySelector('aside');
    const hamburger = document.querySelector('.hamburger-icon');
    
    if (window.innerWidth <= 768) {
        if (!aside.contains(event.target) && !hamburger.contains(event.target)) {
            aside.classList.remove('active');
            hamburger.classList.remove('active');
        }
    }
    
    // Close topic menus when clicking outside
    if (!event.target.closest('.topic-menu')) {
        document.querySelectorAll('.topic-menu-dropdown.active').forEach(menu => {
            menu.classList.remove('active');
        });
    }
});
