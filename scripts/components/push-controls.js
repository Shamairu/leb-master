/*!
 *
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

import {idbKeyval} from '../third_party/idb-keyval.js';
import {SessionLoader} from '../session-loader';
import {PushHandler} from './push-handler';

export class PushControls {

  static init () {
    const notificationTmpl = document.querySelector('#tmpl-notification-area');
    if (!notificationTmpl) {
      console.log('Unable to locate notification template');
      return;
    }

    this._toggleViewVisibility = this._toggleViewVisibility.bind(this);
    this.hide = this.hide.bind(this);
    this.show = this.show.bind(this);
    this._trapTabKey = this._trapTabKey.bind(this);
    this._onHashChange = this._onHashChange.bind(this);
    this._onTransitionEnd = this._onTransitionEnd.bind(this);
    this._removeHash = this._removeHash.bind(this);

    this._firstTabStop = null;
    this._lastTabStop = null;
    this._list = null;
    this._removeAllContainer = null;

    SessionLoader.getData().then(sessions => {
      document.body.appendChild(notificationTmpl.content.cloneNode(true));
      this._element = document.querySelector('.notification-area');
      this._content = this._element.querySelector('.notification-content__list');

      this._toggleButton =
          this._element.querySelector('.notification-toggle-button');
      this._panelTitle =
          this._element.querySelector('.notification-content__title');
      this._panelHeader =
          this._element.querySelector('.notification-content__headline');
      this._closeButton =
          this._element.querySelector('.notification-close-button');
      this._unsubscribeAllButton =
          this._element.querySelector('.notification-content__remove-all');

      this._populateElement(sessions);
      this._addEventListeners();
    }).catch(err => {
      console.log(err);
    });
  }

  static remove () {
    const notificationArea = document.querySelector('.notification-area');
    if (!notificationArea) {
      return;
    }

    notificationArea.parentNode.removeChild(notificationArea);
  }

  static _timeAsString (date) {
    return (date.getHours() < 10 ? '0' : '') +
            date.getHours().toString() +
           (date.getMinutes() < 10 ? '0' : '') +
            date.getMinutes().toString();
  }

  static _toPST (date) {
    var PST_ADJUSTMENT = 28800000;
    var d = new Date(date.getTime());
    d.setTime(
      d.getTime() +
      (d.getTimezoneOffset() * 60000) -
      PST_ADJUSTMENT
    );

    return d;
  }

  static _populateElement (sessions) {
    const allSessions = [...sessions];
    allSessions.unshift([
      '__NONE',
      {
        url: 'event',
        name: 'Event Updates'
      }
    ]);

    const notificationTmpl = document.querySelector('#tmpl-notification-item');

    if (!notificationTmpl) {
      return;
    }

    idbKeyval.get('localized-times').then(shouldLocalize => {
      allSessions.forEach(item => {
        const date = item[0];
        const session = item[1];

        if ((!session.url) || session.notify === false) {
          return;
        }

        const sessionNode = notificationTmpl.content.cloneNode(true);
        const container =
            sessionNode.querySelector('.notification-item__details');
        const title =
            sessionNode.querySelector('.notification-item__breakdown-title');
        const time =
            sessionNode.querySelector('.notification-item__breakdown-time');
        const day =
            sessionNode.querySelector('.notification-item__breakdown-day');

        container.dataset.id = session.url;
        title.textContent =
            (session.speaker ? session.speaker + ': ' : '') + session.name;
        container.dataset.title =
            (session.speaker ? session.speaker + ': ' : '') + session.name;

        if (date === '__NONE') {
          time.parentNode.removeChild(time);
          day.parentNode.removeChild(day);
        } else {
          time.setAttribute('datetime', date.toISOString());
          day.textContent =
            (this._toPST(date).getDate() === 10 ? 'Day 1' : 'Day 2') + ', ';

          let sessionTime = date;
          if (!shouldLocalize) {
            sessionTime = this._toPST(date);
          }

          time.textContent = this._timeAsString(sessionTime);
        }

        this._content.appendChild(sessionNode);
      });

      this.updateListing();

      const items =
          Array.from(this._element.querySelectorAll('.notification-item__details'));

      if (items.length < 1) {
        return;
      }

      this._removeAllContainer = this._element.querySelector(
        '.notification-content__remove-all-container'
      );

      // Select all the possible elements inside the notification area
      // that can be focused
      this._focusableElements = Array.from(
        this._element.querySelectorAll('button:not(.notification-toggle-button)')
      );

      this._firstTabStop = this._focusableElements[0];
      this._lastTabStop = this._focusableElements[this._focusableElements.length - 1];
      this._list = this._element.querySelector('.notification-content__list');

      // Ensure that we capture deeplinks.
      this._onHashChange();
      this._onTransitionEnd();

      requestAnimationFrame(_ => {
        requestAnimationFrame(_ => {
          this._element.classList.add('notification-area--active');
        });
      });
    });
  }

  static updateListing () {
    const items = Array.from(
        this._element.querySelectorAll('.notification-item__details'));

    items.forEach(item => {
      const id = item.dataset.id;
      if (!id) {
        return;
      }

      idbKeyval.get(id).then(value => {
        if (value) {
          item.classList.add('notification-item__details--active');
          item.setAttribute('aria-label', 'Disable notifications for ' +
              item.dataset.title);
        } else {
          item.classList.remove('notification-item__details--active');
          item.setAttribute('aria-label', 'Enable notifications for ' +
              item.dataset.title);
        }
      });
    });
  }

  static _addEventListeners () {
    window.addEventListener('hashchange', this._onHashChange);
    this._toggleButton.addEventListener('click', this._toggleViewVisibility);
    this._element.addEventListener('click', this._handleClick);
    this._unsubscribeAllButton.addEventListener('click', _ => {
      PushHandler.removeSubscription();
    });
    this._closeButton.addEventListener('click', this._removeHash);
    document.addEventListener('click', _ => {
      if (!this._element.classList.contains('notification-area--expanded')) {
        return;
      }

      this._removeHash();
    });
    window.addEventListener('keydown', this._trapTabKey);
    this._element.addEventListener('transitionend', this._onTransitionEnd);
  }

  static _onHashChange (evt) {
    if (evt) {
      evt.preventDefault();
    }

    if (window.location.hash === '#notifications') {
      this.show();
      return;
    }

    this.hide();
  }

  static _onTransitionEnd (evt) {

    if (evt && evt.target !== this._element) {
      // Don't want to listen events from children
      return;
    }

    if (this._element.classList.contains('notification-area--expanded')) {
      this._panelHeader.inert = false;
      this._list.inert = false;
      this._removeAllContainer.inert = false;
      this._panelTitle.focus();
    } else {
      this._list.inert = true;
      this._panelHeader.inert = true;
      this._removeAllContainer.inert = true;

      // Only focus the button if the collapse was part of a proper transition.
      // It won't be for the first call, which is used to set the initial state.
      if (!evt) {
        return;
      }

      if (!evt.target.classList.contains('notification-ripple')) {
        return;
      }

      this._toggleButton.focus();
    }
  }

  static _handleClick (evt) {
    evt.stopPropagation();

    let node = evt.target;
    do {
      if (node && node.classList && node.classList.contains('notification-item__details')) {
        PushHandler.processChange(node);
        return;
      }
      node = node.parentNode;
    } while (node && node !== this._element);
  }

  static _toggleViewVisibility () {
    if (this._element.classList.contains('notification-area--expanded')) {
      this._removeHash();
    } else {
      window.location.hash = 'notifications';
    }
  }

  static _removeHash () {
    // Use pushState to remove the hash so that we don't get scrolling behaviour.
    window.history.pushState(null, null, window.location.href.replace(/#.*$/, ''));

    // As a by-product this won't trigger an onhashchange, so we'll do that ourselves.
    this._onHashChange();
  }

  static show () {
    if (!this._element) {
      return;
    }

    requestAnimationFrame(_ => {
      this._element.classList.add('notification-area--expanded');
    });
  }

  static hide () {
    if (!this._element) {
      return;
    }
    this._element.classList.remove('notification-area--expanded');
  }

  static _trapTabKey (evt) {
    if (this._element.hasAttribute('inert')) {
      return;
    }

    // If the active element is not in the list that we want it to be
    if (this._focusableElements.indexOf(document.activeElement) === -1) {
      evt.preventDefault();
      // then, just focus the first element
      this._firstTabStop.focus();
      return;
    }

    // Check for TAB key press
    if (evt.keyCode === 9) {
      // SHIFT + TAB
      if (evt.shiftKey) {
        if (document.activeElement === this._firstTabStop) {
          evt.preventDefault();
          this._lastTabStop.focus();
        }
      // TAB
      } else if (document.activeElement === this._lastTabStop) {
        evt.preventDefault();
        this._firstTabStop.focus();
      }
    }

    // ESCAPE
    if (evt.keyCode === 27) {
      this._removeHash();
    }
  }
}
