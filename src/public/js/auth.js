(() => {
  const $ = (s) => document.querySelector(s)
  const followBtn = $('#follow')
  const loginDialog = $('#dialog')
  const logoutDialog = $('#logout-dialog')
  const closeLoginBtn = $('#c-dialog')
  const loginGoogle = $('#auth-log-gg')
  const loginFacebook = $('#auth-log-fb')
  const profileContainer = $('#profile-container')
  const profileMenu = $('#profile-dropdown-menu')
  const profileAvatarBtn = $('#profile-avatar-btn')
  const profileAvatarImg = $('#profile-avatar-img')
  const dropdownAvatarImg = $('#dropdown-avatar-img')
  const dropdownName = $('#dropdown-user-name')
  const dropdownEmail = $('#dropdown-user-email')
  const dropdownFollowStatus = $('#dropdown-follow-status')
  const logoutBtn = $('#profile-logout-btn')
  const notifBtn = $('#notif-btn-header')

  const searchForm = $('#search-form')
  const searchInput = $('#search-input')
  const voiceBtn = $('#voice-btn')
  const suggList = $('#search-suggestions')
  const filterPage = $('#filter-page')
  const filterSort = $('#filter-sort')
  const feedbackForm = $('#feedback-form')
  const emailInput = $('#email')
  const messageInput = $('#feedback')

  let me = null
  let ws = null
  let followToggleBusy = false
  let lastScrollY = window.scrollY || 0
  let menuScrolledDown = false
  const LOGIN_TOAST_KEY = 'loginToastShown'

  const TEMP_MAIL_KEY = 'tempMailAddress'
  const PENDING_FEEDBACK_KEY = 'pendingFeedback'
  const MAIL_SYNC_MSG = 'Địa chỉ gửi mail đã được đồng bộ với tài khoản đăng nhập.'
  let accountMailOverride = null
  let mailSyncNotified = false

  const TOAST_DURATION = 4200
  const TOAST_META = {
    success: {
      title: 'Thành công',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9.25"></circle><path stroke-linecap="round" stroke-linejoin="round" d="M8.5 12.4l2.3 2.35L15.5 10"></path></svg>'
    },
    error: {
      title: 'Lỗi',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9.25"></circle><path stroke-linecap="round" stroke-linejoin="round" d="M9 9l6 6M15 9l-6 6"></path></svg>'
    },
    warn: {
      title: 'Cảnh báo',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M12.88 4.52l7.17 12.45a1 1 0 0 1-.88 1.5H4.83a1 1 0 0 1-.88-1.5l7.17-12.45a1 1 0 0 1 1.76 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M12 9.5v4"></path><circle cx="12" cy="16.5" r="0.75" fill="currentColor" stroke="none"></circle></svg>'
    },
    info: {
      title: 'Thông báo',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9.25"></circle><path stroke-linecap="round" stroke-linejoin="round" d="M12 8.85h.01M11.55 11.2h.92c.26 0 .47.21.47.47v4.08"></path></svg>'
    }
  }
  const TOAST_ALIASES = {
    warning: 'warn',
    danger: 'error',
    success: 'success',
    error: 'error',
    info: 'info',
    warn: 'warn'
  }

  if (window.location.hash && window.location.hash === '#_=_') history.replaceState(null, null, window.location.pathname + window.location.search);

  function getToastContainer() {
    let container = document.querySelector('#toast-container')
    if (!container) {
      container = document.createElement('div')
      container.id = 'toast-container'
      container.setAttribute('aria-live', 'polite')
      container.setAttribute('aria-atomic', 'true')
      document.body.appendChild(container)
    }
    return container
  }

  function resolveToastType(type = 'success') {
    const key = String(type || '').toLowerCase()
    if (TOAST_META[key]) return key
    const alias = TOAST_ALIASES[key]
    return TOAST_META[alias] ? alias : 'info'
  }

  function toast(msg, type = 'success') {
    const normalized = resolveToastType(type)
    const meta = TOAST_META[normalized] || TOAST_META.info
    const container = getToastContainer()
    const toastEl = document.createElement('div')
    toastEl.className = `toast toast--${normalized}`
    toastEl.setAttribute('role', normalized === 'error' ? 'alert' : 'status')

    toastEl.innerHTML = [
      `<div class="toast__icon" aria-hidden="true">${meta.icon}</div>`,
      '<div class="toast__body">',
      `<div class="toast__title">${meta.title}</div>`,
      '<div class="toast__message"></div>',
      '</div>',
      '<button class="toast__close" type="button" aria-label="Đóng thông báo">',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75l10.5 10.5M6.75 17.25l10.5-10.5"></path></svg>',
      '</button>',
      '<div class="toast__progress"></div>'
    ].join('')

    const messageNode = toastEl.querySelector('.toast__message')
    if (messageNode) messageNode.textContent = msg

    const progressBar = toastEl.querySelector('.toast__progress')
    if (progressBar) progressBar.style.animationDuration = `${TOAST_DURATION}ms`

    container.appendChild(toastEl)

    requestAnimationFrame(() => {
      toastEl.classList.add('toast--visible')
    })

    let isClosing = false
    const closeToast = () => {
      if (isClosing) return
      isClosing = true
      toastEl.classList.add('toast--leaving')
      toastEl.classList.remove('toast--visible')
      window.setTimeout(() => toastEl.remove(), 320)
    }

    const hideTimer = window.setTimeout(closeToast, TOAST_DURATION)

    const closeBtn = toastEl.querySelector('.toast__close')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        window.clearTimeout(hideTimer)
        if (progressBar) progressBar.style.animationPlayState = 'paused'
        closeToast()
      })
    }
  }

  function readStorage(key) {
    try { return localStorage.getItem(key) } catch { return null }
  }

  function writeStorage(key, value) {
    try { localStorage.setItem(key, value) } catch { }
  }

  function removeStorage(key) {
    try { localStorage.removeItem(key) } catch { }
  }

  function closeProfileMenu() {
    if (profileMenu?.classList.contains('active')) {
      profileMenu.classList.remove('active')
      $('header')?.classList.remove('menu-open')
    }
    menuScrolledDown = false
  }

  function readSession(key) {
    try { return sessionStorage.getItem(key) } catch { return null }
  }

  function writeSession(key, value) {
    try { sessionStorage.setItem(key, value) } catch { }
  }

  function removeSession(key) {
    try { sessionStorage.removeItem(key) } catch { }
  }

  function normalizeEmail(email) {
    return (email || '').trim().toLowerCase()
  }

  function emailsEqual(a, b) {
    return normalizeEmail(a) === normalizeEmail(b)
  }

  function likelyEmail(email) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
  }

  function readTempMail() {
    return readStorage(TEMP_MAIL_KEY) || ''
  }

  function rememberTempMail(email) {
    const trimmed = (email || '').trim()
    if (!trimmed) { clearTempMail(); return }
    if (!likelyEmail(trimmed)) { clearTempMail(); return }
    writeStorage(TEMP_MAIL_KEY, trimmed)
  }

  function clearTempMail() {
    removeStorage(TEMP_MAIL_KEY)
  }

  function getPendingFeedback() {
    const raw = readStorage(PENDING_FEEDBACK_KEY)
    if (!raw) return null
    try { return JSON.parse(raw) } catch { return null }
  }

  function setPendingFeedback(data) {
    writeStorage(PENDING_FEEDBACK_KEY, JSON.stringify(data))
  }

  function clearPendingFeedback() {
    removeStorage(PENDING_FEEDBACK_KEY)
  }

  function updatePendingEmail(targetEmail) {
    const pending = getPendingFeedback()
    if (!pending) return
    pending.email = targetEmail
    setPendingFeedback(pending)
  }

  function handleMailSyncAfterLogin(accountEmail) {
    accountMailOverride = accountEmail || null
    const tempMail = readTempMail()
    if (!tempMail) { clearTempMail(); return }
    if (!accountEmail) { clearTempMail(); return }
    if (!emailsEqual(tempMail, accountEmail)) {
      if (!mailSyncNotified) toast(MAIL_SYNC_MSG)
      mailSyncNotified = true
      updatePendingEmail(accountEmail)
    }
    clearTempMail()
  }

  function formatVN(n) {
    if (n >= 1_000_000_000) return Math.round(n / 1_000_000_000) + 'T'
    if (n >= 1_000_000) return Math.round(n / 1_000_000) + 'Tr'
    if (n >= 1_000) return Math.round(n / 1_000) + 'N'
    return String(n)
  }

  function updateFollowUI(isFollowing, followersCount) {
    if (followBtn) {
      followBtn.querySelector('.follow-label').textContent = isFollowing ? 'Đăng Xuất' : 'Đăng Nhập'
      followBtn.classList.toggle('is-following', !!isFollowing)
    }
    if (!dropdownFollowStatus) return
    if (!me) {
      dropdownFollowStatus.innerHTML = ''
      dropdownFollowStatus.removeAttribute('data-following')
      dropdownFollowStatus.classList.remove('is-following')
      return
    }
    const numericCount = Number(followersCount)
    const safeCount = Number.isFinite(numericCount) ? numericCount : 0
    const statusText = isFollowing ? 'Đang theo dõi' : 'Chưa theo dõi'
    const actionLabel = isFollowing ? 'Bỏ theo dõi' : 'Theo dõi'
    const markup = [
      '<span class="follower-count">' + formatVN(safeCount) + ' người theo dõi</span>',
    ].join('')
    //dropdownFollowStatus.innerHTML = markup
    dropdownFollowStatus.textContent = `${formatVN(safeCount)} Người Theo Dõi`
    dropdownFollowStatus.dataset.following = isFollowing ? 'true' : 'false'
    dropdownFollowStatus.classList.toggle('is-following', !!isFollowing)
    if (me) {
      me.isFollowing = !!isFollowing
      me.followersCount = safeCount
    }
  }
  async function fetchMe() {
    try {
      const res = await fetch('/login', { credentials: 'include' })
      if (!res.ok) return null
      const data = await res.json()
      if (data.code === 401) return null
      return data
    } catch (error) { return null }
  }

  function setProfile(user) {
    me = user
    if (user) {
      handleMailSyncAfterLogin(user.email)
      // Hide follow button after successful login
      followBtn?.classList.add('hidden')
      profileAvatarImg.src = user.avatarUrl
      dropdownAvatarImg.src = profileAvatarImg.src
      dropdownName.textContent = user.name || ''
      dropdownEmail.textContent = user.email || ''
      profileContainer.classList.remove('opacn')
      updateFollowUI(user.isFollowing, user.followersCount)
      if (!readSession(LOGIN_TOAST_KEY)) {
        toast('Đăng nhập thành công')
        writeSession(LOGIN_TOAST_KEY, '1')
      }
      
      // Initialize notification client
      if (window.NotificationClient) {
        window.NotificationClient.init()
      }

      // connectWS()
      // Prefill email field on home page when logged in
      if (emailInput && (accountMailOverride || user.email)) emailInput.value = accountMailOverride || user.email
    } else {
      accountMailOverride = null
      mailSyncNotified = false
      removeSession(LOGIN_TOAST_KEY)
      // Show follow button when logged out
      followBtn?.classList.remove('hidden')
      profileContainer.classList.add('opacn')
      updateFollowUI(false, 0)
      closeProfileMenu()
      
      // Stop notification client
      if (window.NotificationClient) {
        window.NotificationClient.stop()
      }

      // disconnectWS()
      followToggleBusy = false
    }
  }

  // function connectWS() {
  //   if (ws) return
  //   ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws')
  //   ws.addEventListener('message', (e) => {
  //     try {
  //       const msg = JSON.parse(e.data)
  //       if (msg.event === 'followers:update') {
  //         const rawCount = Number(msg.payload?.followersCount)
  //         const nextCount = Number.isFinite(rawCount) ? rawCount : 0
  //         if (me) updateFollowUI(me.isFollowing, nextCount)
  //       }
  //     } catch {}
  //   })
  //   ws.addEventListener('close', () => { ws = null })
  // }
  // function disconnectWS() { if (ws) { try { ws.close() } catch {} ws = null } }

  // Follow button behavior
  followBtn?.addEventListener('click', async () => {
    if (!me) {
      loginDialog.showModal()
      return
    }
    logoutDialog.showModal() // confirm unfollow as sign-out per requirement
  })

  // Notification button behavior
  notifBtn?.addEventListener('click', () => {
    if (!me) {
      loginDialog.showModal()
    } else {
      window.location.href = '/thong-bao'
    }
  })

  closeLoginBtn?.addEventListener('click', () => loginDialog.close())
  loginGoogle?.addEventListener('click', () => { window.location.href = '/auth/google' })
  loginFacebook?.addEventListener('click', () => { window.location.href = '/auth/facebook' })

  $('#confirm-logout')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-csrf-token': getCSRF() }
      })
      if (res.ok) {
        setProfile(null)
        toast('Đăng xuất thành công')
      }
    } finally { logoutDialog.close() }
  })
  $('#cancel-logout')?.addEventListener('click', () => logoutDialog.close())

  // Toggle dropdown profile menu
  profileAvatarBtn?.addEventListener('click', (e) => {
    e.stopPropagation()
    profileMenu?.classList.toggle('active')
    const isActive = profileMenu?.classList.contains('active')
    $('header')?.classList.toggle('menu-open', isActive)

    if (isActive) menuScrolledDown = false
  })
  // Open with keyboard (Enter/Space)
  profileAvatarBtn?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      profileMenu?.classList.toggle('active')
      const isActive = profileMenu?.classList.contains('active')
      $('header')?.classList.toggle('menu-open', isActive)

      if (isActive) menuScrolledDown = false
    }
  })
  // Open logout dialog when clicking item in dropdown
  logoutBtn?.addEventListener('click', (e) => { e.preventDefault(); logoutDialog.showModal() })
  document.addEventListener('click', (e) => {
    if (!profileMenu) return
    const target = e.target
    if (!profileMenu.contains(target) && (!profileAvatarBtn || !profileAvatarBtn.contains(target))) closeProfileMenu()
  })
  window.addEventListener('scroll', () => {
    const currentY = window.scrollY || 0
    const isMobile = window.innerWidth <= 768
    const toastContainer = document.getElementById('toast-container')
    if (toastContainer) {
        if (currentY > 50) {
            toastContainer.classList.add('scrolled')
        } else {
            toastContainer.classList.remove('scrolled')
        }
    }
    if (profileMenu?.classList.contains('active')) {
      if (isMobile) {
        closeProfileMenu()
      } else {
        if (currentY > lastScrollY) {
          if (currentY - lastScrollY > 2) menuScrolledDown = true
        } else if (currentY < lastScrollY) {
          if (menuScrolledDown && lastScrollY - currentY > 2) closeProfileMenu()
        }
      }
    } else {
      menuScrolledDown = false
    }
    lastScrollY = currentY
  }, { passive: true })

  function getCSRF() {
    const m = document.cookie.match(/_csrf=([^;]+)/)
    return m ? decodeURIComponent(m[1]) : ''
  }

  async function sendFeedback(email, message) {
    const res = await fetch('/api/mail', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': getCSRF(),
      },
      credentials: 'include',
      body: JSON.stringify({ email, message })
    })
    if (!res.ok) throw new Error('Mail failed')
    return res.json()
  }

  // Search UX
  // let aborter = null
  // async function doSuggest() {
  //   const q = (searchInput.value || '').trim()
  //   if (!q) { suggList.innerHTML = ''; return }
  //   aborter?.abort()
  //   aborter = new AbortController()
  //   const url = new URL('/api/search/suggest', location.origin)
  //   url.searchParams.set('q', q)
  //   if (filterPage.value) url.searchParams.set('page', filterPage.value)
  //   if (filterSort.value) url.searchParams.set('sort', filterSort.value)
  //   try {
  //     const res = await fetch(url.toString(), { signal: aborter.signal })
  //     const data = await res.json()
  //     suggList.innerHTML = data.suggestions.map((s) => `<div class="sugg" role="option" data-id="${s.id}" data-page="${s.page}">${s.title}</div>`).join('')
  //   } catch {}
  // }
  // searchInput?.addEventListener('input', throttle(doSuggest, 150))
  // searchForm?.addEventListener('submit', (e) => { e.preventDefault(); doSuggest() })
  // suggList?.addEventListener('click', (e) => {
  //   const item = e.target.closest('.sugg')
  //   if (item) window.location.href = '/' + (item.dataset.page || '')
  // })

  // Voice search using Web Speech API
  let rec = null
  voiceBtn?.addEventListener('click', () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { toast('Trình duyệt không hỗ trợ ghi âm', 'warn'); return }
    rec = new SR()
    rec.lang = 'vi-VN'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript
      searchInput.value = text
      doSuggest()
    }
    rec.start()
  })

  function throttle(fn, wait) {
    let t = 0
    return (...args) => { const now = Date.now(); if (now - t > wait) { t = now; fn(...args) } }
  }

  // Initialize
  window.addEventListener('DOMContentLoaded', async () => {
    // Check for handshake token in URL
    const urlParams = new URLSearchParams(window.location.search)
    const handshakeToken = urlParams.get('handshake')

    if (handshakeToken) {
      // Confirm handshake first
      await confirmHandshake(handshakeToken)
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    // Check for login requirement
    if (urlParams.get('login') === 'true') {
      loginDialog?.showModal()
      // Clean URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('login')
      window.history.replaceState({}, document.title, newUrl.toString())
    }

    // Now fetch user data
    const user = await fetchMe()
    setProfile(user || null)
    // If there is a pending feedback request stored before login, auto-send after login
    try {
      const pending = getPendingFeedback()
      if (pending && user) {
        const message = pending.message || ''
        const emailForSend = (accountMailOverride || user.email || '').trim() || (pending.email || '').trim()
        await sendFeedback(emailForSend, message || '')
        toast('Gửi mail thành công')
        clearPendingFeedback()
      }
    } catch { }
  })

  // dropdownFollowStatus?.addEventListener('click', async (e) => {
  //   const toggleBtn = e.target.closest('[data-follow-toggle]')
  //   if (!toggleBtn) return
  //   e.preventDefault()
  //   if (!me) {
  //     loginDialog?.showModal()
  //     return
  //   }
  //   if (followToggleBusy) return
  //   followToggleBusy = true
  //   toggleBtn.disabled = true
  //   try {
  //     const res = await fetch('/api/follow-toggle', {
  //       method: 'POST',
  //       credentials: 'include',
  //       headers: { 'x-csrf-token': getCSRF() }
  //     })
  //     if (!res.ok) throw new Error('follow toggle failed')
  //     const data = await res.json()
  //     updateFollowUI(data.isFollowing, data.followersCount)
  //   } catch {
  //     toast('Cập nhật theo dõi thất bại', 'error')
  //   } finally {
  //     followToggleBusy = false
  //     const btn = dropdownFollowStatus?.querySelector('[data-follow-toggle]')
  //     if (btn) btn.disabled = false
  //   }
  // })

  emailInput?.addEventListener('input', () => {
    if (me) return
    rememberTempMail(emailInput.value)
  })

  // Handle feedback form submit
  feedbackForm?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = (emailInput?.value || '').trim()
    const message = (messageInput?.value || '').trim()

    // Validate input before proceeding
    if (!message) {
      toast('Vui lòng nhập nội dung phản hồi', 'warn')
      messageInput?.focus()
      return
    }

    if (!email || !likelyEmail(email)) {
      toast('Vui lòng nhập địa chỉ email hợp lệ', 'warn')
      emailInput?.focus()
      return
    }

    if (!me) {
      // Not logged in: show login and defer the send
      rememberTempMail(email)
      setPendingFeedback({ email, message })
      loginDialog?.showModal()
      return
    }

    try {
      await sendFeedback(email || me.email || '', message)
      toast('Gửi mail thành công')
      feedbackForm.reset()
      if (emailInput && me.email) emailInput.value = me.email
    } catch {
      toast('Gửi mail thất bại', 'error')
    }
  })
})()