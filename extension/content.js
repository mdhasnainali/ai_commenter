let currentCommentBox = null;
let currentPost = null;
let aiButton = null;

const DEFAULT_BACKEND_URL = "http://localhost:34567/generate";
const DEFAULT_API_KEY = "your-very-long-random-secret-key-change-this";

const COMMENT_STYLES = [
  { id: "professional", label: "Professional", color: "#0a66c2" },
  { id: "friendly", label: "Friendly", color: "#057642" },
  { id: "collaboration", label: "Collaboration", color: "#8b5cf6" },
  { id: "insightful", label: "Insightful", color: "#e67e22" },
  { id: "curious", label: "Curious", color: "#16a085" },
  { id: "supportive", label: "Supportive", color: "#e91e63" },
  { id: "constructive", label: "Constructive", color: "#2c3e50" },
  { id: "enthusiastic", label: "Enthusiastic", color: "#f39c12" },
  { id: "witty", label: "Witty", color: "#9b59b6" },
  { id: "empathetic", label: "Empathetic", color: "#1abc9c" },
  { id: "thoughtful", label: "Thoughtful", color: "#3498db" },
  { id: "minimal", label: "Minimal", color: "#7f8c8d" },
];

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get({
      backendUrl: DEFAULT_BACKEND_URL,
      apiKey: DEFAULT_API_KEY
    }, (items) => {
      resolve(items);
    });
  });
}

// Function to create button for a comment box
function createAIButton() {
  const container = document.createElement("div");
  container.className = "ai-comment-btn-container";
  container.style.cssText = `
    position: absolute;
    z-index: 9999;
  `;

  const button = document.createElement("button");
  button.innerHTML = `<svg width="20" height="20" viewBox="0 0 33 33" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.9446 6.46076C14.2193 5.34828 15.8008 5.34828 16.0754 6.46076C17.2477 11.2094 20.9555 14.9171 25.7041 16.0893C26.8167 16.3639 26.8167 17.9455 25.7041 18.2201C20.9555 19.3924 17.2477 23.1 16.0754 27.8487C15.8008 28.9611 14.2193 28.9611 13.9446 27.8487C12.7723 23.1 9.06455 19.3924 4.31588 18.2201C3.20337 17.9455 3.20337 16.3639 4.31589 16.0893C9.06455 14.9171 12.7723 11.2094 13.9446 6.46076Z" fill="url(#paint0_linear_25_17)"/><path d="M25.6574 1.74675C25.7686 1.29646 26.4087 1.29646 26.5199 1.74675C26.9944 3.66882 28.4952 5.16953 30.4172 5.64401C30.8675 5.75517 30.8675 6.39533 30.4172 6.50649C28.4952 6.98097 26.9944 8.48169 26.5199 10.4038C26.4087 10.854 25.7686 10.854 25.6574 10.4038C25.1829 8.48169 23.6822 6.98097 21.7601 6.50649C21.3098 6.39533 21.3098 5.75517 21.7601 5.64401C23.6822 5.16953 25.1829 3.66882 25.6574 1.74675Z" fill="url(#paint1_linear_25_17)"/><defs><linearGradient id="paint0_linear_25_17" x1="15.01" y1="2.14526" x2="15.01" y2="32.1642" gradientUnits="userSpaceOnUse"><stop stop-color="#B38FFF"/><stop offset="1" stop-color="#6780FE"/></linearGradient><linearGradient id="paint1_linear_25_17" x1="26.0887" y1="0" x2="26.0887" y2="12.1505" gradientUnits="userSpaceOnUse"><stop stop-color="#B38FFF"/><stop offset="1" stop-color="#6780FE"/></linearGradient></defs></svg>`;
  button.className = "ai-comment-btn-inline";
  button.style.cssText = `
    padding: 6px 10px;
    background: white;
    color: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  button.onmouseover = () => {
    button.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
    button.style.transform = "translateY(-1px)";
  };
  button.onmouseout = () => {
    button.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
    button.style.transform = "translateY(0)";
  };
  
  const menu = document.createElement("div");
  menu.className = "ai-comment-menu";
  menu.style.cssText = `
    display: none !important;
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 6px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    min-width: 150px;
    z-index: 99999;
    border: 1px solid #e0e0e0;
    visibility: hidden;
  `;

  COMMENT_STYLES.forEach((style, index) => {
    const btn = document.createElement("button");
    btn.innerHTML = style.label;
    btn.style.cssText = `
      display: block;
      width: 100%;
      padding: 10px 14px;
      background: white;
      border: none;
      ${index > 0 ? 'border-top: 1px solid #f0f0f0;' : ''}
      text-align: left;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: #333;
      transition: background 0.2s;
    `;
    btn.onmouseover = () => btn.style.background = "#f0f4f8";
    btn.onmouseout = () => btn.style.background = "white";
    
    const handleClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      menu.style.display = "none";
      menu.style.visibility = "hidden";
      handleAIButtonClick(style.id);
    };
    btn.onclick = handleClick;
    btn.onmousedown = handleClick;

    menu.appendChild(btn);
  });

  let hoverTimeout;
  let menuVisible = false;
  
  const showMenu = () => {
    menu.style.display = "block";
    menu.style.visibility = "visible";
    menuVisible = true;
  };
  
  const hideMenu = () => {
    menu.style.display = "none";
    menu.style.visibility = "hidden";
    menuVisible = false;
  };
  
  // Show menu on hover after 1 second
  container.onmouseenter = () => {
    hoverTimeout = setTimeout(() => {
      showMenu();
    }, 1000);
  };
  
  // Don't hide immediately - keep menu stable
  container.onmouseleave = (e) => {
    clearTimeout(hoverTimeout);
    // Only hide if mouse is not moving to the menu
    setTimeout(() => {
      if (!menu.matches(':hover') && !button.matches(':hover')) {
        hideMenu();
      }
    }, 100);
  };
  
  // Show menu immediately on click
  button.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if (menuVisible) {
      hideMenu();
    } else {
      showMenu();
    }
  };
  
  // Keep menu visible when hovering over it
  menu.onmouseenter = () => {
    clearTimeout(hoverTimeout);
  };
  
  menu.onmouseleave = () => {
    hideMenu();
  };

  container.appendChild(button);
  container.appendChild(menu);
  
  return container;
}

// Position button relative to comment box
function positionButton(commentBox, button) {
  if (!commentBox || !button) return;
  
  const rect = commentBox.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  
  const topPosition = rect.top + scrollTop - 40;
  const rightPosition = document.documentElement.clientWidth - rect.right - scrollLeft + 10;
  
  button.style.position = "absolute";
  button.style.top = `${topPosition}px`;
  button.style.right = `${rightPosition}px`;
  button.style.left = "auto";
  button.style.zIndex = "99999";
  button.style.display = "block";
}

// Function to detect current platform
function detectPlatform() {
  const hostname = window.location.hostname;
  if (hostname.includes("linkedin.com")) return "linkedin";
  if (hostname.includes("x.com") || hostname.includes("twitter.com")) return "twitter";
  return "unknown";
}

// Function to find the post element
function findPostElement(element) {
  const platform = detectPlatform();
  
  // For X (Twitter)
  if (platform === "twitter") {
    // Check if inside a modal/dialog
    const modal = element.closest('[role="dialog"]');
    if (modal) {
      const tweetInModal = modal.querySelector('article[data-testid="tweet"]');
      if (tweetInModal) return tweetInModal;
    }
    
    // Try to find from the tweetText element in the main page
    const tweetTextEl = element.closest('[data-testid="tweetText"]') || 
                        element.querySelector('[data-testid="tweetText"]');
    if (tweetTextEl) {
      const article = tweetTextEl.closest('article[data-testid="tweet"]') ||
                      tweetTextEl.closest('article');
      if (article) return article;
    }
    
    // Try to find article directly
    const article = element.closest('article[data-testid="tweet"]') ||
                    element.closest('article[role="article"]');
    if (article) return article;
  }
  
  let selectors = [];
  
  if (platform === "twitter") {
    selectors = [
      "article[data-testid='tweet']",
      "article[data-testid='tweetDetail']",
      "article[role='article']",
      "[data-testid='cellInner']",
      "article",
    ];
  } else {
    selectors = [
      ".feed-shared-update-v2",           // LinkedIn main feed post
      ".feed-shared-update-v2__content",  // LinkedIn post content
      "article",                           // Generic article
      "[role='article']",                  // ARIA article
      ".post",                             // Generic post
      "[data-testid*='post']",            // Facebook/Twitter style
      ".story",                            // Story container
      ".feed-shared-update",               // LinkedIn variant
      ".occludable-update",                // LinkedIn update container
      "[data-urn]",                        // LinkedIn URN elements
    ];
  }
  
  for (const selector of selectors) {
    const post = element.closest(selector);
    if (post) return post;
  }
  
  // Fallback: go up several levels and find a substantial container
  let parent = element;
  for (let i = 0; i < 20; i++) {
    parent = parent.parentElement;
    if (!parent) break;
    
    const textContent = parent.innerText || parent.textContent || "";
    const hasEnoughContent = textContent.length > 100;
    const hasPostLikeStructure = parent.querySelector('.feed-shared-social-action-bar, .social-details-social-counts, [aria-label*="Like"], [aria-label*="Comment"], [data-testid="reply"], [data-testid="tweet"], [role="group"][aria-label*="reply"], [data-testid="cellInner"]');
    
    if (hasEnoughContent || hasPostLikeStructure) return parent;
  }
  
  return null;
}

// Function to check if element is a comment input
function isCommentInput(element) {
  if (!element) return false;
  
  const platform = detectPlatform();
  
  // Check various input types
  const isTextarea = element.tagName === 'TEXTAREA';
  const isTextInput = element.tagName === 'INPUT' && element.type === 'text';
  const isContentEditable = element.contentEditable === 'true' || element.getAttribute('contenteditable') === 'true';
  const isDivInput = element.tagName === 'DIV' && (element.role === 'textbox' || element.getAttribute('role') === 'textbox');
  
  // X (Twitter) specific check - check for X's compose box (2026)
  let isXInput = false;
  if (platform === 'twitter') {
    const isXTextarea = element.tagName === 'TEXTAREA' && 
      (element.getAttribute('aria-label')?.toLowerCase().includes('tweet') || 
       element.getAttribute('aria-label')?.toLowerCase().includes('post') ||
       element.getAttribute('aria-label')?.toLowerCase().includes('reply'));
    const isDraftEditor = element.getAttribute('contenteditable') === 'true' && 
      (element.className?.includes('public-DraftStyleDefault') ||
       element.getAttribute('data-offset-key')?.includes('-'));
    const isXDivInput = element.getAttribute('contenteditable') === 'true' && 
      (element.getAttribute('role') === 'textbox' || 
       element.className?.includes('editor') ||
       element.getAttribute('data-testid')?.includes('tweet'));
    const isXInputDiv = element.tagName === 'INPUT' && 
      element.getAttribute('aria-label')?.toLowerCase().includes('tweet');
    isXInput = isXTextarea || isDraftEditor || isXDivInput || isXInputDiv;
  }
  
  return isTextarea || isTextInput || isContentEditable || isDivInput || isXInput;
}

// Function to show button for comment box
function showButtonForCommentBox(target) {
  currentCommentBox = target;
  currentPost = findPostElement(target);
  
  if (aiButton && document.body.contains(aiButton)) {
    positionButton(currentCommentBox, aiButton);
    return;
  }
  
  try {
    aiButton = createAIButton();
    document.body.appendChild(aiButton);
    
    if (aiButton && currentCommentBox && document.body.contains(aiButton)) {
      positionButton(currentCommentBox, aiButton);
    }
  } catch (e) {
    console.error("Error creating button:", e);
  }
}

// Listen for focus on any input element
document.addEventListener("focus", (e) => {
  const target = e.target;
  
  if (isCommentInput(target)) {
    if (currentCommentBox === target && aiButton && aiButton.parentNode) return;
    showButtonForCommentBox(target);
  }
}, true);

// Also listen for input events (for contenteditable divs)
document.addEventListener("input", (e) => {
  const target = e.target;
  
  if (isCommentInput(target) && (!aiButton || !aiButton.parentNode)) {
    showButtonForCommentBox(target);
  }
}, true);

// Also listen for clicks
document.addEventListener("click", (e) => {
  const target = e.target;
  
  if (target.closest(".ai-comment-btn-container") || target.closest(".ai-comment-menu")) return;
  if (target.closest(".ai-result")) return;
  
  if (isCommentInput(target)) {
    if (currentCommentBox === target && aiButton && aiButton.parentNode) return;
    showButtonForCommentBox(target);
  } else {
    if (aiButton && aiButton.parentNode) {
      aiButton.remove();
      aiButton = null;
    }
    currentCommentBox = null;
    currentPost = null;
  }
}, true);

// Also use mousedown as backup
document.addEventListener("mousedown", (e) => {
  const target = e.target;
  
  if (isCommentInput(target) && currentCommentBox === target && aiButton && aiButton.parentNode) return;
  if (isCommentInput(target) && (!aiButton || !aiButton.parentNode)) {
    showButtonForCommentBox(target);
  }
}, true);

// Update button position on scroll
let scrollTimeout;
window.addEventListener("scroll", () => {
  if (aiButton && currentCommentBox) {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      positionButton(currentCommentBox, aiButton);
    }, 10);
  }
}, true);

// Function to detect language of text
function detectLanguage(text) {
  if (!text) return "en";
  
  // Bengali script detection
  const bengaliRegex = /[\u0980-\u09FF]/g;
  // English/Latin detection
  const englishRegex = /[a-zA-Z]/g;
  
  const bengaliMatches = text.match(bengaliRegex) || [];
  const englishMatches = text.match(englishRegex) || [];
  
  const totalAlpha = bengaliMatches.length + englishMatches.length;
  if (totalAlpha === 0) return "en";

  // If Bengali characters exist and are more than 10% of total alpha characters,
  // or if there are more Bengali characters than English, consider it Bengali
  if (bengaliMatches.length > totalAlpha * 0.1 || bengaliMatches.length > englishMatches.length) {
    return "bn";
  }
  
  return "en";
}

// Function to extract post text
function getPostText(postElement) {
  if (!postElement) return "";
  
  const platform = detectPlatform();
  const clone = postElement.cloneNode(true);
  
  // Remove comment sections, buttons, and other noise
  const elementsToRemove = clone.querySelectorAll(
    '.comments-comment-box, .comments-comment-list, .comments-comment-item, button, .social-details-social-counts, [role="button"], input, textarea, nav, header, footer, [data-testid="reply"], [data-testid="retweet"], [data-testid="like"], [data-testid="share"], [role="group"], [aria-label*="reply"], [aria-label*="retweet"], [aria-label*="like"], [aria-label*="share"]'
  );
  elementsToRemove.forEach(el => el.remove());
  
  let selectors = [];
  
  if (platform === "twitter") {
    selectors = [
      "[role='dialog'] article [data-testid='tweetText']", // X modal
      "article [data-testid='tweetText']",                // X text in article
      "article div[data-testid='tweetText']",             // X tweet text
      "[data-testid='tweetText']",                        // X tweet text anywhere
      "article div[dir='auto']",                           // X text with dir
      "article div[lang]",                                 // X multilingual text
    ];
  } else {
    selectors = [
      ".feed-shared-update-v2__description",   // LinkedIn main text
      ".feed-shared-text",                     // LinkedIn alt
      ".break-words",                          // LinkedIn
      "[data-testid*='post-text']",           // Facebook/Twitter
      ".post-content",                         // Generic
      ".update-components-text",               // LinkedIn update
      ".feed-shared-inline-show-more-text",   // LinkedIn show more text
      "[dir='ltr']",                           // LinkedIn text direction
    ];
  }
  
  for (const selector of selectors) {
    const element = clone.querySelector(selector);
    if (element && element.innerText.trim().length > 20) {
      return element.innerText.trim();
    }
  }
  
  let allText = clone.innerText || clone.textContent || "";
  allText = allText.trim().replace(/\s+/g, ' ');
  
  if (allText.length > 20) return allText;
  
  const originalText = postElement.innerText || postElement.textContent || "";
  return originalText.replace(/\s+/g, ' ').trim();
}

// Button click handler
async function handleAIButtonClick(type) {
  if (aiButton && aiButton.parentNode) {
    aiButton.remove();
    aiButton = null;
  }
  
  if (!currentPost && currentCommentBox) {
    currentPost = findPostElement(currentCommentBox);
  }
  
  if (!currentPost) {
    alert("No post found. Please click on a comment box within a post.");
    return;
  }

  const postText = getPostText(currentPost);

  if (!postText || postText.length < 10) {
    alert("No text found in this post. Make sure you're clicking on a comment box within a post.");
    return;
  }

  const language = detectLanguage(postText);

  showLoading(currentPost, type);

  try {
    const comment = await fetchComment(postText, type, language);
    showComment(currentPost, comment, type);
  } catch (err) {
    const oldLoader = currentPost.querySelector(".ai-loader");
    if (oldLoader) oldLoader.remove();
    
    const errorDiv = document.createElement("div");
    errorDiv.className = "ai-loader";
    errorDiv.style.borderLeft = "4px solid #d32f2f";
    errorDiv.style.color = "#d32f2f";
    errorDiv.innerHTML = err.message;
    currentPost.appendChild(errorDiv);
  }
}

async function fetchComment(postText, type, language = "en") {
  const platform = detectPlatform();
  const settings = await getSettings();

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: "fetchComment",
      url: settings.backendUrl,
      options: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": settings.apiKey
        },
        body: JSON.stringify({ postText, type, language, platform })
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response.success) {
        resolve(response.data.comment);
      } else {
        reject(new Error(response.error));
      }
    });
  });
}
function showLoading(post, type) {
  const oldLoader = post.querySelector(".ai-loader");
  if (oldLoader) oldLoader.remove();
  
  const style = COMMENT_STYLES.find(s => s.id === type);
  const label = style ? style.label : "AI";
  
  let loader = document.createElement("div");
  loader.className = "ai-loader";
  loader.innerText = `Generating ${label} comment...`;
  post.appendChild(loader);
}

function showComment(post, comment, type) {
  // Remove old results and loader
  const old = post.querySelector(".ai-result");
  if (old) old.remove();
  
  const oldLoader = post.querySelector(".ai-loader");
  if (oldLoader) oldLoader.remove();

  if (!comment) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "ai-loader";
    errorDiv.style.color = "#666";
    errorDiv.innerText = "No comment generated";
    post.appendChild(errorDiv);
    return;
  }

  const container = document.createElement("div");
  container.className = "ai-result";

  const style = COMMENT_STYLES.find(s => s.id === type);
  const label = style ? style.label : "AI";
  const color = style ? style.color : "#0a66c2";

  const section = document.createElement("div");
  section.className = "ai-comment-section";

  const header = document.createElement("div");
  header.className = "ai-section-header";
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: ${color};
  `;
  
  const titleSpan = document.createElement("strong");
  titleSpan.innerText = label;
  
  const iconsContainer = document.createElement("div");
  iconsContainer.style.cssText = `
    display: flex;
    gap: 8px;
    align-items: center;
  `;
  
  // Regenerate button
  const regenerateBtn = document.createElement("button");
  regenerateBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`;
  regenerateBtn.style.cssText = `
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    color: ${color};
    opacity: 0.7;
    transition: opacity 0.2s;
  `;
  regenerateBtn.onmouseover = () => regenerateBtn.style.opacity = "1";
  regenerateBtn.onmouseout = () => regenerateBtn.style.opacity = "0.7";
  regenerateBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.remove();
    showLoading(post, type);
    const postText = getPostText(post);
    const language = detectLanguage(postText);
    fetchComment(postText, type, language).then(newComment => {
      showComment(post, newComment, type);
    }).catch(err => {
      const oldLoader = post.querySelector(".ai-loader");
      if (oldLoader) oldLoader.remove();
    });
  };
  
  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  closeBtn.style.cssText = `
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    color: ${color};
    opacity: 0.7;
    transition: opacity 0.2s;
  `;
  closeBtn.onmouseover = () => closeBtn.style.opacity = "1";
  closeBtn.onmouseout = () => closeBtn.style.opacity = "0.7";
  closeBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    container.remove();
    
    // Keep button visible so user can generate another comment
    // Don't reset aiButton, currentCommentBox, or currentPost
  };
  
  iconsContainer.appendChild(regenerateBtn);
  iconsContainer.appendChild(closeBtn);
  
  header.appendChild(titleSpan);
  header.appendChild(iconsContainer);
  section.appendChild(header);

  const box = document.createElement("div");
  box.className = "ai-comment-box";

  const text = document.createElement("p");
  text.className = "ai-comment-text";
  text.innerText = comment;

  const buttonContainer = document.createElement("div");
  buttonContainer.style.cssText = `
    display: flex;
    gap: 8px;
    align-items: center;
  `;

  const copyBtn = document.createElement("button");
  copyBtn.className = "ai-copy-btn";
  copyBtn.innerHTML = "Copy";
  copyBtn.style.background = color;
  copyBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent click from bubbling up
    e.stopImmediatePropagation();
    navigator.clipboard.writeText(comment);
    copyBtn.innerHTML = "✓ Copied!";
    
    // Automatically remove the container after copying
    setTimeout(() => {
      container.remove();
      
      // Keep button visible so user can generate another comment
      // Don't reset aiButton, currentCommentBox, or currentPost
    }, 500); // Short delay to show "Copied!" feedback
  };

  box.appendChild(text);
  buttonContainer.appendChild(copyBtn);
  box.appendChild(buttonContainer);
  section.appendChild(box);
  container.appendChild(section);

  post.appendChild(container);
}

// Remove the interval since we're using click detection now

// Observe for dynamically added comment boxes
const observer = new MutationObserver((mutations) => {
  if (aiButton && aiButton.parentNode) return;
  
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === 1) {
        const commentInputs = node.querySelectorAll ? 
          node.querySelectorAll('textarea, input[type="text"], [contenteditable="true"], [role="textbox"]') : 
          [];
        
        if (commentInputs.length > 0) {
          showButtonForCommentBox(commentInputs[0]);
        }
      }
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
