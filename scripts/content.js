// 创建小狮子元素
function createLion() {
  const lion = document.createElement('div');
  lion.id = 'e-pet-lion';
  lion.style.left = '80%';
  lion.style.top = '80%';
  
  lion.innerHTML = `
    <div class="lion-container">
      <div class="lion-body">
        <div class="lion-face">
          <div class="lion-eye left"></div>
          <div class="lion-eye right"></div>
          <div class="lion-mouth"></div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(lion);
  return lion;
}

// 初始化小狮子的状态
let lionState = {
  mood: 'happy',
  isActive: true,
  isDragging: false,
  initialX: 0,
  initialY: 0,
  currentX: 0,
  currentY: 0,
  customImage: null,
  emotionValue: 80, // 添加情绪值，初始值为80
  lastInteractionTime: Date.now() // 记录最后交互时间
};

// 添加拖拽功能
function addDragInteraction(lion) {
  lion.addEventListener('mousedown', startDragging);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDragging);
}

function startDragging(e) {
  const lion = document.getElementById('e-pet-lion');
  if (!lion) return;

  lionState.isDragging = true;
  lion.classList.add('dragging');
  
  lionState.initialX = e.clientX - lion.offsetLeft;
  lionState.initialY = e.clientY - lion.offsetTop;
}

function drag(e) {
  if (!lionState.isDragging) return;
  
  const lion = document.getElementById('e-pet-lion');
  if (!lion) return;

  e.preventDefault();
  
  lionState.currentX = e.clientX - lionState.initialX;
  lionState.currentY = e.clientY - lionState.initialY;
  
  const maxX = window.innerWidth - lion.offsetWidth;
  const maxY = window.innerHeight - lion.offsetHeight;
  
  lionState.currentX = Math.max(0, Math.min(lionState.currentX, maxX));
  lionState.currentY = Math.max(0, Math.min(lionState.currentY, maxY));
  
  lion.style.left = `${lionState.currentX}px`;
  lion.style.top = `${lionState.currentY}px`;
}

function stopDragging() {
  if (!lionState.isDragging) return;
  
  const lion = document.getElementById('e-pet-lion');
  if (!lion) return;

  lionState.isDragging = false;
  lion.classList.remove('dragging');
  
  chrome.storage.local.set({
    position: {
      x: lionState.currentX,
      y: lionState.currentY
    }
  });
}

// 更新宠物形象
function updatePetImage(imageData) {
  const lion = document.getElementById('e-pet-lion');
  if (!lion) return;

  // 创建临时Canvas来处理图片
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  img.onload = function() {
    // 设置canvas大小与图片相同
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // 获取图片的主色调
    const mainColor = getMainColor(ctx, canvas.width, canvas.height);
    
    // 更新宠物外观
    const lionBody = lion.querySelector('.lion-body');
    if (lionBody) {
      lionBody.style.background = mainColor;
      lionBody.style.border = '3px solid #000';
      
      // 保持面部特征可见，但使用新的颜色
      const face = lion.querySelector('.lion-face');
      if (face) {
        face.style.display = 'block';
        face.style.background = mainColor;
      }
    }
  };

  img.src = imageData;
  lionState.customImage = mainColor;
}

// 获取图片的主色调
function getMainColor(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  let r = 0, g = 0, b = 0;
  let count = 0;

  // 采样计算平均颜色
  for (let i = 0; i < data.length; i += 16) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }

  // 计算平均值
  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);

  return `rgb(${r}, ${g}, ${b})`;
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === 'updatePosition') {
      updatePosition(request.position);
    } else if (request.action === 'updateImage') {
      updatePetImage(request.imageData);
    } else if (request.action === 'resetImage') {
      const lion = document.getElementById('e-pet-lion');
      if (lion) {
        const lionBody = lion.querySelector('.lion-body');
        if (lionBody) {
          lionBody.style.background = '#FFE600';
          lionBody.style.border = '3px solid #000';
          
          const face = lion.querySelector('.lion-face');
          if (face) {
            face.style.display = 'block';
            face.style.background = '#FFE600';
          }
        }
      }
      lionState.customImage = null;
    } else if (request.action === 'getState') {
      sendResponse({ state: lionState });
      return;
    }
    sendResponse({ success: true });
  } catch (error) {
    console.error('Extension context error:', error);
    // 尝试重新初始化小狮子
    try {
      const lion = createLion();
      addDragInteraction(lion);
      addContextMenu(lion);
    } catch (initError) {
      console.error('Failed to reinitialize lion:', initError);
    }
  }
});

// 添加右键菜单功能
function addContextMenu(lion) {
  lion.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    
    // 创建菜单元素
    const menu = document.createElement('div');
    menu.className = 'lion-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.style.zIndex = '10000';
    menu.style.background = '#fff';
    menu.style.border = '1px solid #ccc';
    menu.style.borderRadius = '4px';
    menu.style.padding = '5px 0';
    menu.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    
    // 添加菜单选项
    const options = [
      { text: '抚摸', action: 'pet' },
      { text: '喂食', action: 'feed' },
      { text: '聊天', action: 'chat' }
    ];
    
    options.forEach(option => {
      const item = document.createElement('div');
      item.textContent = option.text;
      item.style.padding = '8px 20px';
      item.style.cursor = 'pointer';
      item.style.fontSize = '14px';
      
      item.addEventListener('mouseover', () => {
        item.style.background = '#f0f0f0';
      });
      
      item.addEventListener('mouseout', () => {
        item.style.background = 'transparent';
      });
      
      item.addEventListener('click', () => {
        handleInteraction(option.action);
        menu.remove();
      });
      
      menu.appendChild(item);
    });
    
    document.body.appendChild(menu);
    
    // 点击其他地方关闭菜单
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 0);
  });
}

// 处理互动
function handleInteraction(action) {
  switch(action) {
    case 'pet':
      updateEmotionValue(10);
      showInteractionEffect('❤️');
      break;
    case 'feed':
      updateEmotionValue(15);
      showInteractionEffect('🍖');
      break;
    case 'chat':
      showInteractionEffect('💭');
      break;
  }
  
  lionState.lastInteractionTime = Date.now();
  updateLionMood();
  saveLionState();
}

// 更新情绪值
function updateEmotionValue(change) {
  lionState.emotionValue = Math.max(0, Math.min(100, lionState.emotionValue + change));
}

// 显示互动效果
function showInteractionEffect(emoji) {
  const lion = document.getElementById('e-pet-lion');
  if (!lion) return;
  
  const effect = document.createElement('div');
  effect.style.position = 'absolute';
  effect.style.left = '50%';
  effect.style.top = '0';
  effect.style.transform = 'translateX(-50%)';
  effect.style.fontSize = '24px';
  effect.style.animation = 'floatUp 1s ease-out';
  effect.textContent = emoji;
  
  lion.appendChild(effect);
  
  setTimeout(() => effect.remove(), 1000);
}

// 更新狮子心情
function updateLionMood() {
  const lion = document.getElementById('e-pet-lion');
  if (!lion) return;

  // 根据情绪值更新表情
  const face = lion.querySelector('.lion-face');
  if (face) {
    if (lionState.emotionValue >= 80) {
      face.style.transform = 'scale(1.1)';
      lionState.mood = 'happy';
    } else if (lionState.emotionValue >= 40) {
      face.style.transform = 'scale(1)';
      lionState.mood = 'normal';
    } else {
      face.style.transform = 'scale(0.9)';
      lionState.mood = 'sad';
    }
  }
}

// 保存狮子状态
function saveLionState() {
  try {
    chrome.storage.local.set({
      lionState: {
        emotionValue: lionState.emotionValue,
        mood: lionState.mood,
        lastInteractionTime: lionState.lastInteractionTime
      }
    });
  } catch (error) {
    console.error('Storage operation failed:', error);
  }
}

// 定期更新状态
function updateLionState() {
  // 每5分钟减少1点情绪值
  const timePassed = (Date.now() - lionState.lastInteractionTime) / (1000 * 60);
  const emotionDecrease = Math.floor(timePassed / 5);
  
  if (emotionDecrease > 0) {
    updateEmotionValue(-emotionDecrease);
    updateLionMood();
    saveLionState();
    lionState.lastInteractionTime = Date.now();
  }
}

// 初始化小狮子
const lion = createLion();
addDragInteraction(lion);
addContextMenu(lion);

// 定期更新状态
setInterval(updateLionState, 5000);