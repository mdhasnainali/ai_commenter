// ──────────────────────────── State ────────────────────────────
let currentCommentBox = null;
let currentPost = null;
let aiButton = null;
let scrollTimeout = null;

// ──────────────────────────── Constants ────────────────────────────
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

const PROMPT_TEMPLATES = {
  professional: { id: 1, text: "Read this {postRef} and write a very concise professional comment. Focus on the core insight or news. Contribute one brief perspective. No fluff. {languageInstruction} Return ONLY the comment text:\n\n{postText}" },
  friendly: { id: 2, text: "Read this {postRef} and write a short, human comment. Respond to the story with a quick, supportive observation. Keep it very punchy. {languageInstruction} Return ONLY the comment text:\n\n{postText}" },
  collaboration: { id: 3, text: "Read this {postRef} and write a concise professional comment. Acknowledge a point and suggest a chat. Keep it brief and authentic. {languageInstruction} Return ONLY the comment text:\n\n{postText}" },
  insightful: { id: 4, text: "Read this {postRef} and write an insightful comment. Identify a deeper trend, implication, or angle others might miss. Sound sharp but not arrogant. {languageInstruction} Return ONLY the comment text:\n\n{postText}" },
  curious: { id: 5, text: "Read this {postRef} and write a curious comment. Ask a thoughtful follow-up question that moves the conversation forward. Show genuine interest. {languageInstruction} Return ONLY the comment text:\n\n{postText}" },
  supportive: { id: 6, text: "Read this {postRef} and write a supportive comment. Offer genuine encouragement or appreciation. Be warm but not over-the-top. {languageInstruction} Return ONLY the comment text:\n\n{postText}" },
  constructive: { id: 7, text: "Read this {postRef} and write a constructive comment. Offer a respectful counterpoint or alternative perspective. Be polite and evidence-based. {languageInstruction} Return ONLY the comment text:\n\n{postText}" },
  enthusiastic: { id: 8, text: "Read this {postRef} and write an enthusiastic comment. React with genuine excitement and energy. Use an exclamation. {languageInstruction} Return ONLY the comment text:\n\n{postText}" },
  witty: { id: 9, text: "Read this {postRef} and write a witty comment. Make a clever observation or playful joke about the content. Keep it smart, not mean. {languageInstruction} Return ONLY the comment text:\n\n{postText}" },
  empathetic: { id: 10, text: "Read this {postRef} and write an empathetic comment. Connect with the human side of the post. Show you understand their experience. {languageInstruction} Return ONLY the comment text:\n\n{postText}" },
  thoughtful: { id: 11, text: "Read this {postRef} and write a thoughtful comment. Offer a reflective, balanced take. Consider nuance and acknowledge complexity. {languageInstruction} Return ONLY the comment text:\n\n{postText}" },
  minimal: { id: 12, text: "Read this {postRef} and write an ultra-short comment. A quick reaction or one-liner. Punchy, memorable, stops the scroll. {languageInstruction} Return ONLY the comment text:\n\n{postText}" },
};

// ──────────────────────────── Utilities ────────────────────────────

function detectPlatform() {
  const hostname = window.location.hostname;
  if (hostname.includes("linkedin.com")) return "linkedin";
  if (hostname.includes("x.com") || hostname.includes("twitter.com")) return "twitter";
  return "unknown";
}

function detectLanguage(text) {
  if (!text) return "en";
  const bengaliRegex = /[\u0980-\u09FF]/g;
  const englishRegex = /[a-zA-Z]/g;
  const bengaliMatches = text.match(bengaliRegex) || [];
  const englishMatches = text.match(englishRegex) || [];
  const totalAlpha = bengaliMatches.length + englishMatches.length;
  if (totalAlpha === 0) return "en";
  if (bengaliMatches.length > totalAlpha * 0.1 || bengaliMatches.length > englishMatches.length) return "bn";
  return "en";
}

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get({
      backendUrl: DEFAULT_BACKEND_URL,
      apiKey: DEFAULT_API_KEY
    }, resolve);
  });
}

function isCommentInput(element) {
  if (!element) return false;
  const platform = detectPlatform();
  const tag = element.tagName;
  const isTextarea = tag === "TEXTAREA";
  const isTextInput = tag === "INPUT" && element.type === "text";
  const isContentEditable = element.contentEditable === "true" || element.getAttribute("contenteditable") === "true";
  const isDivInput = tag === "DIV" && element.role === "textbox";

  if (platform !== "twitter") return isTextarea || isTextInput || isContentEditable || isDivInput;

  const ariaLabel = (element.getAttribute("aria-label") || "").toLowerCase();
  const isTweetArea = isTextarea && (ariaLabel.includes("tweet") || ariaLabel.includes("post") || ariaLabel.includes("reply"));
  const isDraft = isContentEditable && (element.getAttribute("data-offset-key") || "").includes("-");
  const isEditor = isContentEditable && (element.role === "textbox" || (element.getAttribute("data-testid") || "").includes("tweet"));
  const isTweetInput = tag === "INPUT" && ariaLabel.includes("tweet");
  return isTextarea || isTextInput || isContentEditable || isDivInput || isTweetArea || isDraft || isEditor || isTweetInput;
}

function getStyle(type) {
  return COMMENT_STYLES.find(s => s.id === type);
}

// ──────────────────────────── Post Detection ────────────────────────────

function findPostElement(element) {
  const platform = detectPlatform();

  if (platform === "twitter") {
    const modal = element.closest('[role="dialog"]');
    if (modal) {
      const tweetInModal = modal.querySelector('article[data-testid="tweet"]');
      if (tweetInModal) return tweetInModal;
    }
    const article = element.closest('article[data-testid="tweet"]') || element.closest('article[role="article"]');
    if (article) return article;
  }

  const selectors = platform === "twitter"
    ? ["article[data-testid='tweet']", "article[data-testid='tweetDetail']", "article[role='article']", "[data-testid='cellInner']", "article"]
    : [".feed-shared-update-v2", ".feed-shared-update-v2__content", "article", "[role='article']",
       ".post", "[data-testid*='post']", ".story", ".feed-shared-update", ".occludable-update", "[data-urn]"];

  for (const selector of selectors) {
    const post = element.closest(selector);
    if (post) return post;
  }

  let parent = element;
  for (let i = 0; i < 20; i++) {
    parent = parent.parentElement;
    if (!parent) break;
    const textContent = (parent.innerText || parent.textContent || "").trim();
    const hasStructure = parent.querySelector('.feed-shared-social-action-bar, .social-details-social-counts, [aria-label*="Like"], [aria-label*="Comment"], [data-testid="reply"], [data-testid="tweet"], [role="group"][aria-label*="reply"], [data-testid="cellInner"]');
    if (textContent.length > 100 || hasStructure) return parent;
  }
  return null;
}

function getPostText(postElement) {
  if (!postElement) return "";
  const platform = detectPlatform();
  const clone = postElement.cloneNode(true);

  clone.querySelectorAll(
    '.comments-comment-box, .comments-comment-list, .comments-comment-item, button, .social-details-social-counts, [role="button"], input, textarea, nav, header, footer, [data-testid="reply"], [data-testid="retweet"], [data-testid="like"], [data-testid="share"], [role="group"], [aria-label*="reply"], [aria-label*="retweet"], [aria-label*="like"], [aria-label*="share"]'
  ).forEach(el => el.remove());

  const selectors = platform === "twitter"
    ? ["[role='dialog'] article [data-testid='tweetText']", "article [data-testid='tweetText']", "article div[data-testid='tweetText']", "[data-testid='tweetText']", "article div[dir='auto']", "article div[lang]"]
    : [".feed-shared-update-v2__description", ".feed-shared-text", ".break-words", "[data-testid*='post-text']", ".post-content", ".update-components-text", ".feed-shared-inline-show-more-text", "[dir='ltr']"];

  for (const selector of selectors) {
    const el = clone.querySelector(selector);
    if (el && el.innerText.trim().length > 20) return el.innerText.trim();
  }

  const allText = (clone.innerText || clone.textContent || "").trim().replace(/\s+/g, " ");
  if (allText.length > 20) return allText;

  return (postElement.innerText || postElement.textContent || "").replace(/\s+/g, " ").trim();
}

// ──────────────────────────── AI Button ────────────────────────────

function createAIButton() {
  const container = document.createElement("div");
  container.className = "ai-comment-btn-container";
  container.style.cssText = "position:absolute;z-index:9999;";

  const button = document.createElement("button");
  button.className = "ai-comment-btn-inline";
  button.style.cssText = "padding:6px 10px;background:white;color:white;border:1px solid #e0e0e0;border-radius:6px;cursor:pointer;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.1);transition:all 0.2s ease;display:flex;align-items:center;justify-content:center;";
  button.innerHTML = `<svg width="20" height="20" viewBox="0 0 33 33" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.9446 6.46076C14.2193 5.34828 15.8008 5.34828 16.0754 6.46076C17.2477 11.2094 20.9555 14.9171 25.7041 16.0893C26.8167 16.3639 26.8167 17.9455 25.7041 18.2201C20.9555 19.3924 17.2477 23.1 16.0754 27.8487C15.8008 28.9611 14.2193 28.9611 13.9446 27.8487C12.7723 23.1 9.06455 19.3924 4.31588 18.2201C3.20337 17.9455 3.20337 16.3639 4.31589 16.0893C9.06455 14.9171 12.7723 11.2094 13.9446 6.46076Z" fill="url(#paint0_linear_25_17)"/><path d="M25.6574 1.74675C25.7686 1.29646 26.4087 1.29646 26.5199 1.74675C26.9944 3.66882 28.4952 5.16953 30.4172 5.64401C30.8675 5.75517 30.8675 6.39533 30.4172 6.50649C28.4952 6.98097 26.9944 8.48169 26.5199 10.4038C26.4087 10.854 25.7686 10.854 25.6574 10.4038C25.1829 8.48169 23.6822 6.98097 21.7601 6.50649C21.3098 6.39533 21.3098 5.75517 21.7601 5.64401C23.6822 5.16953 25.1829 3.66882 25.6574 1.74675Z" fill="url(#paint1_linear_25_17)"/><defs><linearGradient id="paint0_linear_25_17" x1="15.01" y1="2.14526" x2="15.01" y2="32.1642" gradientUnits="userSpaceOnUse"><stop stop-color="#B38FFF"/><stop offset="1" stop-color="#6780FE"/></linearGradient><linearGradient id="paint1_linear_25_17" x1="26.0887" y1="0" x2="26.0887" y2="12.1505" gradientUnits="userSpaceOnUse"><stop stop-color="#B38FFF"/><stop offset="1" stop-color="#6780FE"/></linearGradient></defs></svg>`;

  button.onmouseover = () => { button.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"; button.style.transform = "translateY(-1px)"; };
  button.onmouseout = () => { button.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"; button.style.transform = "translateY(0)"; };

  const menu = document.createElement("div");
  menu.className = "ai-comment-menu";
  menu.style.cssText = "display:none!important;position:absolute;top:100%;left:0;margin-top:6px;background:white;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.2);overflow:hidden;min-width:150px;z-index:99999;border:1px solid #e0e0e0;visibility:hidden;";

  COMMENT_STYLES.forEach((style, index) => {
    const btn = document.createElement("button");
    btn.textContent = style.label;
    btn.style.cssText = `display:block;width:100%;padding:10px 14px;background:white;border:none;${index > 0 ? "border-top:1px solid #f0f0f0;" : ""}text-align:left;cursor:pointer;font-size:13px;font-weight:500;color:#333;transition:background 0.2s;`;
    btn.onmouseover = () => btn.style.background = "#f0f4f8";
    btn.onmouseout = () => btn.style.background = "white";
    const handleClick = (e) => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); menu.style.display = "none"; menu.style.visibility = "hidden"; handleStyleSelected(style.id); };
    btn.onclick = handleClick;
    btn.onmousedown = handleClick;
    menu.appendChild(btn);
  });

  let hoverTimeout;
  let menuVisible = false;
  const showMenu = () => { menu.style.display = "block"; menu.style.visibility = "visible"; menuVisible = true; };
  const hideMenu = () => { menu.style.display = "none"; menu.style.visibility = "hidden"; menuVisible = false; };

  container.onmouseenter = () => { hoverTimeout = setTimeout(showMenu, 1000); };
  container.onmouseleave = () => {
    clearTimeout(hoverTimeout);
    setTimeout(() => { if (!menu.matches(":hover") && !button.matches(":hover")) hideMenu(); }, 100);
  };
  button.onclick = (e) => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); menuVisible ? hideMenu() : showMenu(); };
  menu.onmouseenter = () => clearTimeout(hoverTimeout);
  menu.onmouseleave = hideMenu;

  container.appendChild(button);
  container.appendChild(menu);
  return container;
}

function positionButton(commentBox, button) {
  if (!commentBox || !button) return;
  const rect = commentBox.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  button.style.cssText = `position:absolute;top:${rect.top + scrollTop - 40}px;right:${document.documentElement.clientWidth - rect.right - scrollLeft + 10}px;left:auto;z-index:99999;display:block;`;
}

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
    if (aiButton && currentCommentBox) positionButton(currentCommentBox, aiButton);
  } catch (e) {
    console.error("Error creating button:", e);
  }
}

// ──────────────────────────── Inline Editor ────────────────────────────

function showCustomInstructionsInline(postText, type, language) {
  const style = getStyle(type);
  const label = style ? style.label : type;
  const color = style ? style.color : "#0a66c2";
  let post = currentPost;

  if (!post || !document.body.contains(post)) {
    post = currentCommentBox ? findPostElement(currentCommentBox) : null;
    if (post) currentPost = post;
  }
  if (!post || !document.body.contains(post)) return;

  const old = post.querySelector(".ai-result");
  if (old) old.remove();

  const container = document.createElement("div");
  container.className = "ai-result";

  const section = document.createElement("div");
  section.className = "ai-comment-section editor-section";

  const header = document.createElement("div");
  header.className = "ai-section-header";
  header.style.cssText = `display:flex;align-items:center;justify-content:space-between;color:${color};`;

  const titleSpan = document.createElement("strong");
  titleSpan.textContent = `✨ ${label}`;

  const closeBtn = document.createElement("button");
  closeBtn.style.cssText = "background:none;border:none;cursor:pointer;padding:4px;display:flex;align-items:center;color:#999;font-size:18px;line-height:1;";
  closeBtn.textContent = "✕";
  closeBtn.onclick = () => {
    container.remove();
    if (!aiButton || !document.body.contains(aiButton)) {
      aiButton = createAIButton();
      document.body.appendChild(aiButton);
      if (currentCommentBox) positionButton(currentCommentBox, aiButton);
    }
  };

  header.appendChild(titleSpan);
  header.appendChild(closeBtn);
  section.appendChild(header);

  const box = document.createElement("div");
  box.className = "ai-comment-box";
  box.style.cssText = "background:white;border:1px solid #e0e0e0;margin-bottom:0;";

  const promptLabel = document.createElement("div");
  promptLabel.style.cssText = "font-size:13px;font-weight:600;color:#333;margin-bottom:6px;";
  promptLabel.innerHTML = 'Default Prompt <span style="font-weight:400;color:#999;">(editable)</span>:';

  const promptTextarea = document.createElement("textarea");
  promptTextarea.className = "ai-modal-prompt";
  promptTextarea.style.cssText = "width:100%;min-height:90px;padding:10px;border:1px solid #d0d0d0;border-radius:6px;font-size:13px;font-family:SFMono-Regular,Consolas,monospace;line-height:1.5;resize:vertical;box-sizing:border-box;margin-bottom:12px;background:#fafafa;color:#333;";
  promptTextarea.placeholder = "Loading prompt template...";
  promptTextarea.value = "Loading...";

  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:16px;margin-bottom:12px;align-items:flex-start;";

  const sentencesGroup = document.createElement("div");
  sentencesGroup.style.cssText = "flex:0 0 140px;";

  const sentencesLabel = document.createElement("div");
  sentencesLabel.style.cssText = "font-size:13px;font-weight:600;color:#333;margin-bottom:6px;";
  sentencesLabel.textContent = "Number of sentences:";

  const sentencesInput = document.createElement("input");
  sentencesInput.type = "number";
  sentencesInput.className = "ai-modal-sentences";
  sentencesInput.style.cssText = "width:100%;padding:8px 10px;border:1px solid #d0d0d0;border-radius:6px;font-size:14px;box-sizing:border-box;";
  sentencesInput.value = "1";
  sentencesInput.min = "1";
  sentencesInput.max = "10";

  sentencesGroup.appendChild(sentencesLabel);
  sentencesGroup.appendChild(sentencesInput);
  row.appendChild(sentencesGroup);

  const instructionsLabel = document.createElement("div");
  instructionsLabel.style.cssText = "font-size:13px;font-weight:600;color:#333;margin-bottom:6px;";
  instructionsLabel.innerHTML = 'Custom Instructions <span style="font-weight:400;color:#999;">(optional)</span>:';

  const instructionsTextarea = document.createElement("textarea");
  instructionsTextarea.className = "ai-modal-instructions";
  instructionsTextarea.style.cssText = "width:100%;min-height:60px;padding:10px;border:1px solid #d0d0d0;border-radius:6px;font-size:13px;line-height:1.5;resize:vertical;box-sizing:border-box;margin-bottom:4px;";
  instructionsTextarea.placeholder = "e.g., Focus on the technical aspect, mention a specific framework...";

  const savedMsg = document.createElement("span");
  savedMsg.style.cssText = "font-size:12px;color:#057642;opacity:0;transition:opacity 0.3s;";
  savedMsg.textContent = "Saved";

  box.appendChild(promptLabel);
  box.appendChild(promptTextarea);
  box.appendChild(row);
  box.appendChild(instructionsLabel);
  box.appendChild(instructionsTextarea);

  const footer = document.createElement("div");
  footer.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid #eee;";

  const footerLeft = document.createElement("div");
  footerLeft.style.cssText = "display:flex;align-items:center;gap:8px;";

  const saveBtn = document.createElement("button");
  saveBtn.style.cssText = "padding:7px 12px;background:white;color:#0a66c2;border:1px solid #0a66c2;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;";
  saveBtn.textContent = "Save as Default";

  const resetBtn = document.createElement("button");
  resetBtn.style.cssText = "padding:7px 12px;background:white;color:#999;border:1px solid #d0d0d0;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;";
  resetBtn.textContent = "Reset";

  footerLeft.appendChild(saveBtn);
  footerLeft.appendChild(resetBtn);
  footerLeft.appendChild(savedMsg);

  const footerRight = document.createElement("div");
  footerRight.style.cssText = "display:flex;align-items:center;gap:10px;";

  const loadingEl = document.createElement("div");
  loadingEl.style.cssText = "display:none;align-items:center;gap:6px;color:#666;font-size:13px;";
  loadingEl.innerHTML = '<div style="width:14px;height:14px;border:2px solid #e0e0e0;border-top-color:#0a66c2;border-radius:50%;animation:aiSpin 0.6s linear infinite;"></div> Generating...';

  const cancelBtn = document.createElement("button");
  cancelBtn.style.cssText = "padding:7px 16px;background:white;color:#333;border:1px solid #d0d0d0;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;";
  cancelBtn.textContent = "Cancel";

  const generateBtn = document.createElement("button");
  generateBtn.style.cssText = "padding:7px 16px;background:#0a66c2;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;";
  generateBtn.textContent = "Generate";

  footerRight.appendChild(loadingEl);
  footerRight.appendChild(cancelBtn);
  footerRight.appendChild(generateBtn);

  footer.appendChild(footerLeft);
  footer.appendChild(footerRight);
  box.appendChild(footer);
  section.appendChild(box);
  container.appendChild(section);
  post.appendChild(container);

  // Load prompt template
  const STORAGE_KEY = `saved_prompt_${type}`;
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    if (result[STORAGE_KEY]) {
      promptTextarea.value = result[STORAGE_KEY];
    } else {
      const tpl = PROMPT_TEMPLATES[type];
      promptTextarea.value = tpl ? tpl.text : `Read this {postRef} and write a comment in ${label.toLowerCase()} style. {languageInstruction} Return ONLY the comment text:\n\n{postText}`;
    }
  });

  saveBtn.onclick = () => {
    chrome.storage.local.set({ [STORAGE_KEY]: promptTextarea.value }, () => {
      savedMsg.style.opacity = "1";
      setTimeout(() => { savedMsg.style.opacity = "0"; }, 1500);
    });
  };

  resetBtn.onclick = () => {
    chrome.storage.local.remove(STORAGE_KEY, () => {
      const tpl = PROMPT_TEMPLATES[type];
      promptTextarea.value = tpl ? tpl.text : `Read this {postRef} and write a comment in ${label.toLowerCase()} style. {languageInstruction} Return ONLY the comment text:\n\n{postText}`;
      savedMsg.textContent = "Reset";
      savedMsg.style.opacity = "1";
      setTimeout(() => { savedMsg.style.opacity = "0"; savedMsg.textContent = "Saved"; }, 1500);
    });
  };

  cancelBtn.onclick = () => {
    container.remove();
    if (!aiButton || !document.body.contains(aiButton)) {
      aiButton = createAIButton();
      document.body.appendChild(aiButton);
      if (currentCommentBox) positionButton(currentCommentBox, aiButton);
    }
  };

  generateBtn.onclick = async () => {
    generateBtn.disabled = true;
    loadingEl.style.display = "flex";

    const promptText = promptTextarea.value;
    const numSentences = parseInt(sentencesInput.value, 10) || 1;
    const customInstructions = instructionsTextarea.value.trim();

    container.remove();
    showLoading(post, type);
    try {
      const comment = await fetchComment(postText, type, language, promptText, customInstructions, numSentences);
      showComment(post, comment, type, promptText, customInstructions, numSentences);
    } catch (err) {
      const oldLoader = post.querySelector(".ai-loader");
      if (oldLoader) oldLoader.remove();
      const errorDiv = document.createElement("div");
      errorDiv.className = "ai-loader";
      errorDiv.style.cssText = "border-left:4px solid #d32f2f;color:#d32f2f;";
      errorDiv.textContent = err.message;
      post.appendChild(errorDiv);
    }
  };
}

// ──────────────────────────── Core Logic ────────────────────────────

async function handleStyleSelected(type) {
  if (aiButton && aiButton.parentNode) {
    aiButton.remove();
    aiButton = null;
  }
  if (!currentPost && currentCommentBox) currentPost = findPostElement(currentCommentBox);

  const postText = currentPost ? getPostText(currentPost) : "";
  if (!postText || postText.length < 10) {
    alert("No post text found. Click on a comment box within a post first.");
    return;
  }

  if (!currentPost || !document.body.contains(currentPost)) {
    currentPost = currentCommentBox ? findPostElement(currentCommentBox) : null;
  }
  if (!currentPost || !document.body.contains(currentPost)) {
    alert("Post element not found. Try clicking on the comment box again.");
    return;
  }

  showCustomInstructionsInline(postText, type, detectLanguage(postText));
}

async function fetchComment(postText, type, language = "en", promptText = null, customInstructions = null, numSentences = 1) {
  const settings = await getSettings();
  const body = { postText, type, language, platform: detectPlatform(), numSentences, prompt: promptText };
  if (customInstructions) body.customInstructions = customInstructions;

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: "fetchComment",
      url: settings.backendUrl,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": settings.apiKey },
        body: JSON.stringify(body)
      }
    }, (response) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (response.success) return resolve(response.data.comment);
      reject(new Error(response.error));
    });
  });
}

// ──────────────────────────── UI — Results ────────────────────────────

function showLoading(post, type) {
  const oldLoader = post.querySelector(".ai-loader");
  if (oldLoader) oldLoader.remove();
  const label = (getStyle(type) || {}).label || "AI";
  const loader = document.createElement("div");
  loader.className = "ai-loader";
  loader.textContent = `Generating ${label} comment...`;
  post.appendChild(loader);
}

function showComment(post, comment, type, promptText, customInstructions, numSentences) {
  const old = post.querySelector(".ai-result");
  if (old) old.remove();
  const oldLoader = post.querySelector(".ai-loader");
  if (oldLoader) oldLoader.remove();

  if (!comment) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "ai-loader";
    errorDiv.style.color = "#666";
    errorDiv.textContent = "No comment generated";
    post.appendChild(errorDiv);
    return;
  }

  const style = getStyle(type);
  const label = style ? style.label : "AI";
  const color = style ? style.color : "#0a66c2";

  const container = document.createElement("div");
  container.className = "ai-result";

  const section = document.createElement("div");
  section.className = "ai-comment-section";

  const header = document.createElement("div");
  header.className = "ai-section-header";
  header.style.cssText = `display:flex;align-items:center;justify-content:space-between;color:${color};`;

  const titleSpan = document.createElement("strong");
  titleSpan.textContent = label;

  const iconsContainer = document.createElement("div");
  iconsContainer.style.cssText = "display:flex;gap:8px;align-items:center;";

  const iconBtnStyle = `background:none;border:none;cursor:pointer;padding:4px;display:flex;align-items:center;color:${color};opacity:0.7;transition:opacity 0.2s;`;

  const regenerateBtn = document.createElement("button");
  regenerateBtn.style.cssText = iconBtnStyle;
  regenerateBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>`;
  regenerateBtn.onmouseover = () => regenerateBtn.style.opacity = "1";
  regenerateBtn.onmouseout = () => regenerateBtn.style.opacity = "0.7";
  regenerateBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.remove();
    showLoading(post, type);
    const postText = getPostText(post);
    fetchComment(postText, type, detectLanguage(postText), promptText, customInstructions, numSentences)
      .then(newComment => showComment(post, newComment, type, promptText, customInstructions, numSentences))
      .catch(() => { const loader = post.querySelector(".ai-loader"); if (loader) loader.remove(); });
  };

  const closeBtn = document.createElement("button");
  closeBtn.style.cssText = iconBtnStyle;
  closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  closeBtn.onmouseover = () => closeBtn.style.opacity = "1";
  closeBtn.onmouseout = () => closeBtn.style.opacity = "0.7";
  closeBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); container.remove(); };

  iconsContainer.appendChild(regenerateBtn);
  iconsContainer.appendChild(closeBtn);
  header.appendChild(titleSpan);
  header.appendChild(iconsContainer);
  section.appendChild(header);

  const box = document.createElement("div");
  box.className = "ai-comment-box";

  const text = document.createElement("p");
  text.className = "ai-comment-text";
  text.textContent = comment;

  const copyBtn = document.createElement("button");
  copyBtn.className = "ai-copy-btn";
  copyBtn.textContent = "Copy";
  copyBtn.style.background = color;
  copyBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    navigator.clipboard.writeText(comment);
    copyBtn.textContent = "✓ Copied!";
    setTimeout(() => container.remove(), 500);
  };

  box.appendChild(text);
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = "display:flex;gap:8px;align-items:center;";
  btnContainer.appendChild(copyBtn);
  box.appendChild(btnContainer);
  section.appendChild(box);
  container.appendChild(section);
  post.appendChild(container);
}

// ──────────────────────────── Event Listeners ────────────────────────────

document.addEventListener("focus", (e) => {
  if (isCommentInput(e.target) && !(currentCommentBox === e.target && aiButton && aiButton.parentNode)) {
    showButtonForCommentBox(e.target);
  }
}, true);

document.addEventListener("input", (e) => {
  if (isCommentInput(e.target) && (!aiButton || !aiButton.parentNode)) {
    showButtonForCommentBox(e.target);
  }
}, true);

document.addEventListener("click", (e) => {
  const target = e.target;
  if (target.closest(".ai-comment-btn-container") || target.closest(".ai-comment-menu") || target.closest(".ai-result")) return;
  if (isCommentInput(target)) {
    if (!(currentCommentBox === target && aiButton && aiButton.parentNode)) showButtonForCommentBox(target);
  } else if (aiButton && aiButton.parentNode) {
    aiButton.remove();
    aiButton = null;
    currentCommentBox = null;
    currentPost = null;
  }
}, true);

document.addEventListener("mousedown", (e) => {
  if (isCommentInput(e.target) && (!aiButton || !aiButton.parentNode)) {
    showButtonForCommentBox(e.target);
  }
}, true);

window.addEventListener("scroll", () => {
  if (aiButton && currentCommentBox) {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => positionButton(currentCommentBox, aiButton), 10);
  }
}, true);

// ──────────────────────────── Mutation Observer ────────────────────────────

const observer = new MutationObserver((mutations) => {
  if (aiButton && aiButton.parentNode) return;
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === 1) {
        const inputs = node.querySelectorAll ? node.querySelectorAll('textarea, input[type="text"], [contenteditable="true"], [role="textbox"]') : [];
        if (inputs.length > 0) showButtonForCommentBox(inputs[0]);
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
