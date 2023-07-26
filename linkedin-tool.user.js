// ==UserScript==
// @name        LinkedIn Tool
// @namespace   dalgoda@gmail.com
// @match       https://www.linkedin.com/*
// @version     0.12
// @author      Mike Castle
// @description Add some stuff to LinkedIn.  So far, just keystrokes.
// @grant       GM_addStyle
// @downloadURL https://github.com/nexushoratio/userscripts/raw/main/linkedin-tool.user.js
// @supportURL  https://github.com/nexushoratio/userscripts/issues
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/shortcut@1
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// ==/UserScript==

(function () {
  'use strict';

  // I'm lazy.  The version of emacs I'm using does not support
  // #private variables out of the box, so using underscores until I
  // get a working configuration.
  class Page {
    _pathname;
    _keyboard = new VM.shortcut.KeyboardService();
    _auto_keys = [];

    static _navOption = {
      caseSensitive: true,
      condition: '!inputFocus',
    };

    start() {
      for (const {key, func} of this._auto_keys) {
	this._addKey(key, func.bind(this));
      }
    }

    get pathname() {
      return this._pathname;
    }

    activate() {
      this._keyboard.enable();
    }

    deactivate() {
      this._keyboard.disable();
    }

    _addKey(key, func) {
      this._keyboard.register(key, func, Page._navOption);
    }

  }

  class Global extends Page {
    _pathname = null;
    _auto_keys = [
      {key: '?', description: 'Help', func: this._help},
      {key: '/', description: 'Search', func: this._gotoSearch},
      {key: 'g h', description: 'Go Home (aka, Feed)', func: this._goHome},
      {key: 'g m', description: 'Go to My Network', func: this._gotoMyNetwork},
      {key: 'g j', description: 'Go to Jobs', func: this._gotoJobs},
      {key: 'g g', description: 'Go to Messaging', func: this._gotoMessaging},
      {key: 'g n', description: 'Go to Notifications', func: this._gotoNotifications},
      {key: 'g p', description: 'Go to Profile (aka, Me)', func: this._gotoProfile},
      {key: 'g b', description: 'Go to Business', func: this._gotoBusiness},
      {key: 'g l', description: 'Go to Learning', func: this._gotoLearning},
    ];

    _gotoNavLink(item) {
      document.querySelector(`#global-nav a[href*="/${item}"`).click();
    }

    _gotoNavButton(item) {
      const buttons = document.querySelectorAll('#global-nav button');
      for (const el of buttons) {
	if (el.textContent.includes(item)) {
	  el.click();
	  break;
	}
      }
    }

    _help() {
      alert('The help is in another castle.');
    }

    _gotoSearch() {
      document.querySelector('#global-nav-search input').focus();
    }

    _goHome() {
      this._gotoNavLink('feed');
    }

    _gotoMyNetwork() {
      this._gotoNavLink('mynetwork');
    }

    _gotoJobs() {
      this._gotoNavLink('jobs');
    }

    _gotoMessaging() {
      this._gotoNavLink('messaging');
    }

    _gotoNotifications() {
      this._gotoNavLink('notifications');
    }

    _gotoProfile() {
      this._gotoNavButton('Me');
    }

    _gotoBusiness() {
      this._gotoNavButton('Business');
    }

    _gotoLearning() {
      this._gotoNavLink('learning');
    }

  }

  class Feed extends Page {
    _pathname = '/feed/';
    _auto_keys = [
      {key: 'j', description: 'Next post', func: this._nextPost},
      {key: 'J', description: 'Toggle hiding then next post', func: this._nextPostPlus},
      {key: 'k', description: 'Previous post', func: this._prevPost},
      {key: 'K', description: 'Toggle hiding then previous post', func: this._prevPostPlus},
      {key: 'X', description: 'Toggle hiding post', func: this._togglePost},
      {key: 'c', description: 'Show comments', func: this._showComments},
      {key: 'm', description: 'Show more of the post', func: this._seeMore},
      {key: 'l', description: 'Load more posts (if [New Posts] button is available, load those)', func: this._loadMorePosts},
      {key: 'L', description: 'Like post', func: this._likePost},
    ];

    _postIndex = -1;
    _postId = null;

    _getPosts() {
      return document.querySelectorAll('main div[data-id]');
    }

    _scrollToPost(post) {
      post.scrollIntoView();
      // TODO(https://github.com/nexushoratio/userscripts/issues/9)
      post.setAttribute('tabindex', 0);
      post.focus();
      this._postId = post.dataset.id;
    }

    _scrollBy(n, recursed = false) {
      const posts = this._getPosts();
      this._postIndex = Math.max(Math.min(this._postIndex +n, posts.length), 0);
      const post = posts[this._postIndex];
      // Some posts are hidden, (ads, suggestions).  Skip over at least one.
      if (post.clientHeight === 0 && !recursed) {
	this._scrollBy(n, true);
      } else {
	this._scrollToPost(post);
      }
    }

    _nextPost() {
      this._scrollBy(1);
    }

    _nextPostPlus() {
      this._togglePost();
      this._nextPost();
    }

    _prevPost() {
      this._scrollBy(-1);
    }

    _prevPostPlus() {
      this._togglePost();
      this._prevPost();
    }

    _togglePost() {
      const post = this._getPosts()[this._postIndex];
      if (post) {
	const dismiss = post.querySelector('button[aria-label^="Dismiss post"]');
	if (dismiss) {
	  dismiss.click();
	} else {
	  const undo = post.querySelector('button[aria-label^="Undo and show"]');
	  if (undo) {
	    undo.click();
	  }
	}
      }
    }

    _showComments() {
      const post = this._getPosts()[this._postIndex];
      if (post) {
	const comments = post.querySelector('button[aria-label*="comment"]');
	if (comments) {
	  comments.click();
	}
      }
    }

    _seeMore() {
      const post = this._getPosts()[this._postIndex];
      if (post) {
	const see_more = post.querySelector('button[aria-label^="see more"]');
	if (see_more) {
	  see_more.click();
	}
      }
    }

    _likePost() {
      const post = this._getPosts()[this._postIndex];
      if (post) {
	const like_button = post.querySelector('button[aria-label^="Open reactions menu"]');
	like_button.click();
      }
    }

    _loadMorePosts() {
      const posts = this._getPosts();
      const new_updates = posts[0].querySelector('div.feed-new-update-pill button');
      if (new_updates) {
	new_updates.click();
	this._postIndex = -1;
      } else {
	const show_more = document.querySelector('main button.scaffold-finite-scroll__load-button');
	if (show_more) {
	  show_more.click();
	  posts[this._postIndex].focus();
	}
      }
    }

  }

  class Jobs extends Page {
    _pathname = '/jobs/';
  }

  class JobsCollections extends Page {
    _pathname = '/jobs/collections/';
  }

  class Pages {
    _global = null;
    _page = null;
    _pages = new Map();

    register(page) {
      page.start();
      if (page.pathname === null) {
	this._global = page;
	this._global.activate();
      } else {
	this._pages.set(page.pathname, page);
      }
    }

    _findPage(pathname) {
      const pathnames = Array.from(this._pages.keys());
      const candidates = pathnames.filter(p => pathname.startsWith(p));
      const candidate = candidates.reduce((a, b) => {
	  return a.length > b.length ? a : b;
      }, '');
      return this._pages.get(pathname) || null;
    }

    activate(pathname) {
      if (this._page) {
	this._page.deactivate();
      }
      const page = this._findPage(pathname);
      this._page = page;
      if (page) {
	page.activate();
      }
    }
  }

  const pages = new Pages();
  pages.register(new Global());
  pages.register(new Feed());
  pages.register(new Jobs());
  pages.register(new JobsCollections);
  pages.activate(window.location.pathname);

  const kbService = new VM.shortcut.KeyboardService();
  const navOption = {
    caseSensitive: true,
    condition: '!inputFocus',
  };
  // kbService.enable();

  // TODO: Likely move into Pages.
  // const current = {
  //   _post: -1,
  //   get post() {
  //     const post = document.activeElement.closest('div[data-id]');
  //     if (post && post !== document.activeElement) {
  // 	const relatives = getRelatives();
  // 	const n = Array.prototype.findIndex.call(relatives, element => element === post);
  // 	this._post = n;
  //     }
  //     return this._post;
  //   },
  //   set post(v) {
  //     this._post = v;
  //   }
  // };

  function isInput(element) {
    return (element.isContentEditable || element.tagName === 'INPUT');
  }

  VM.observe(document.body, () => {
    const navbar = document.querySelector('#global-nav');

    if (navbar) {
      // TODO(https://github.com/nexushoratio/userscripts/issues/4)
      GM_addStyle(`div { scroll-margin-top: ${navbar.clientHeight + 4}px }`);

      return true;
    }
  });

  // TODO: Move this to Pages.
  // VM.observe(document.body, () => {
  //   console.debug('observer for main');
  //   const main = document.querySelector('main');
  //   if (main) {
  //     // TODO: factor this into standalone function.
  //     main.addEventListener('click', (e) => {
  // 	const post = e.target.closest('div[data-id]');
  // 	if (post) {
  // 	  const relatives = getRelatives();
  // 	  const n = Array.prototype.findIndex.call(relatives, element => element === post);
  // 	  current.post = n;
  // 	  scrollToCurrent(relatives);
  // 	}
  //     });

  //     return true
  //   }
  // });

  let oldUrl = new URL(window.location);
  VM.observe(document.body, () => {
    const newUrl = new URL(window.location);
    if (oldUrl.href !== newUrl.href) {
      const evt = new CustomEvent('href', {detail: {old: oldUrl, new: newUrl}})
      oldUrl = newUrl;
      document.dispatchEvent(evt);
    }
  });

  // TODO: Most likely needs to go into Pages and inform all Page instances.
  // document.addEventListener('focus', (e) => {
  //   if (isInput(e.target)) {
  //     kbService.setContext('inputFocus', true);
  //   }
  // }, true);
  // document.addEventListener('blur', (e) => {
  //   if (isInput(e.target)) {
  //     kbService.setContext('inputFocus', false);
  //   }
  // }, true);

  document.addEventListener('href', (e) => {
    pages.activate(e.detail.new.pathname);
  }, true);

})();
