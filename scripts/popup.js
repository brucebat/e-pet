// 获取DOM元素
const positionSelect = document.getElementById('position');
const animationCheckbox = document.getElementById('animation');
const moodSpan = document.getElementById('mood');
const statusSpan = document.getElementById('status');
const petImage = document.getElementById('pet-image');
const imagePreview = document.getElementById('image-preview');

// 从storage加载设置
chrome.storage.local.get(['position', 'animation', 'customImage'], (result) => {
  if (result.position) {
    positionSelect.value = result.position;
  }
  if (typeof result.animation !== 'undefined') {
    animationCheckbox.checked = result.animation;
  }
  if (result.customImage) {
    imagePreview.src = result.customImage;
    imagePreview.style.display = 'block';
  }
});

// 监听设置变化
positionSelect.addEventListener('change', (e) => {
  const position = e.target.value;
  chrome.storage.local.set({ position });
  
  // 向content script发送消息更新位置
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'updatePosition',
      position: position
    });
  });
});

animationCheckbox.addEventListener('change', (e) => {
  const animation = e.target.checked;
  chrome.storage.local.set({ animation });
});

// 处理图片上传
document.getElementById('upload-btn').addEventListener('click', () => {
  document.getElementById('pet-image').click();
});

// 处理重置按钮点击
document.getElementById('reset-btn').addEventListener('click', () => {
  // 清除预览图片
  imagePreview.src = '';
  imagePreview.style.display = 'none';
  
  // 清除storage中的自定义图片
  chrome.storage.local.remove('customImage');
  
  // 向content script发送消息重置宠物形象
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'resetImage'
    });
  });
});

petImage.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result;
      // 预览图片
      imagePreview.src = imageData;
      imagePreview.style.display = 'block';
      
      // 保存图片数据到storage
      chrome.storage.local.set({ customImage: imageData });
      
      // 向content script发送消息更新宠物形象
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'updateImage',
          imageData: imageData
        });
      });
    };
    reader.readAsDataURL(file);
  }
});

// 定期更新状态
function updateStatus() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getState' }, (response) => {
      if (response && response.state) {
        moodSpan.textContent = response.state.mood === 'happy' ? '开心' : '平静';
        statusSpan.textContent = response.state.isActive ? '活跃' : '睡眠';
      }
    });
  });
}

// 每秒更新一次状态
setInterval(updateStatus, 1000);