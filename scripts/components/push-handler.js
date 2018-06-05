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
import {urlBase64ToUint8Array} from '../third_party/urlBase64ToUint8Array.js';
import {Toast} from './toast';
import {PushControls} from './push-controls';

export class PushHandler {

  static get REMOTE_SERVER () {
    return 'https://cds-push.appspot.com';
  }

  static init () {
    if (Notification.permission === 'denied') {
      PushHandler._shutdown();
      return;
    }

    // Post conference. Shut down.
    PushHandler._shutdown();
    return;

    this._waiting = false;
    this._key = null;
    this._keyString = null;
    this._keyHasChanged = false;
    this._subscription = null;
    this._intitialized = false;
    this._init = fetch(PushHandler.REMOTE_SERVER)
        .then(r => r.text())
        .then(applicationServerKey => {
          this._keyString = applicationServerKey;
          this._key = urlBase64ToUint8Array(applicationServerKey);
        })
        .then(_ => idbKeyval.get('appkey'))
        .then(key => {
          if (!key) {
            return idbKeyval.set('appkey', this._keyString);
          }

          if (key !== this._keyString) {
            console.warn('Keys have changed... removing subscription');
            this._keyHasChanged = true;
            return this.removeSubscription();
          }
        }).then(_ => {
          this._intitialized = true;
          PushHandler.updateCurrentView();
          PushControls.init();
        })
        .catch(err => {
          console.warn('Unable to get push started');
          console.warn(err.stack);
          this._shutdown();
        });

    this.updateSubscriptions = this.updateSubscriptions.bind(this);
    this.removeSubscription = this.removeSubscription.bind(this);
  }

  static _shutdown () {
    // Remove all buttons.
    const buttons = document.querySelectorAll('.notification-btn');
    for (let button of buttons) {
      button.parentNode.removeChild(button);
    }

    document.body.classList.remove('push-enabled');
    PushControls.remove();
  }

  static showControls () {
    if (!this._init) {
      return;
    }

    this._init.then(_ => {
      PushControls.show();
    });
  }

  static hideControls () {
    if (!this._init) {
      return;
    }

    this._init.then(_ => {
      PushControls.hide();
    });
  }

  static updateCurrentView () {
    if (!this._intitialized) {
      return;
    }

    const eventUpdates = document.querySelector('.event-updates');
    if (eventUpdates) {
      eventUpdates.classList.add('event-updates--active');
    }

    const notificationButtons =
        Array.from(document.querySelectorAll('.notification-btn'));
    if (!notificationButtons.length) {
      return;
    }

    notificationButtons.forEach(notificationButton => {
      const ID = notificationButton.dataset.id;
      const notificationButtonContent =
          notificationButton.querySelector('.notification-btn__inner');
      if (!ID) {
        return;
      }

      notificationButton.disabled = true;
      notificationButton.hidden = false;

      idbKeyval.get(ID).then(value => {
        notificationButton.disabled = false;
        if (value) {
          notificationButton.classList.add('notification-btn--enabled');
          notificationButton.classList.remove('notification-btn--disabled');
        } else {
          notificationButton.classList.remove('notification-btn--enabled');
          notificationButton.classList.add('notification-btn--disabled');
        }

        notificationButtonContent.textContent = '';
      });
    });
  }

  static processChange (evt) {
    const node = evt.target || evt;
    if (!node) {
      return;
    }

    if (!node.dataset) {
      return;
    }

    const id = node.dataset.id;
    if (!id) {
      return;
    }

    if (this._waiting) {
      return;
    }

    // Disable any buttons for the item in question.
    PushHandler._disableButtons(`button[data-id="${id}"]`);

    idbKeyval.get(id).then(currentValue => {
      const subscribed = (typeof currentValue === 'undefined') ? true : !currentValue;

      Toast.create('Updating subscriptions...', {
        tag: id
      });

      PushHandler.updateSubscriptions([{id, subscribed}]).then(_ => {
        Toast.create(subscribed ?
            'Subscribed successfully.' :
            'Unsubscribed successfully.', {
              tag: id
            });
        PushHandler.updateCurrentView();
        PushControls.updateListing();

        PushHandler._enableButtons(`button[data-id="${id}"]`);
      }).catch(_ => {
        Toast.create('Unable to update notifications.', {
          tag: id
        });

        this._waiting = false;
        PushHandler._enableButtons(`button[data-id="${id}"]`);
      });
    });
  }

  static _disableButtons (selector) {
    const buttons = Array.from(document.querySelectorAll(selector));
    buttons.forEach(button => {
      button.disabled = true;
    });
  }

  static _enableButtons (selector) {
    const buttons = Array.from(document.querySelectorAll(selector));
    buttons.forEach(button => {
      button.disabled = false;
    });
  }

  static removeSubscription () {
    if (this._waiting) {
      return;
    }

    this._waiting = true;

    PushHandler._disableButtons('button[data-id]');
    Toast.create('Unsubscribing...', {
      tag: 'all'
    });

    if (typeof window.ga === 'function') {
      window.ga('send', 'event', 'subscription', 'removed');
    }

    return this._getSubscription().then(subscription => {
      const subscriptionJSON = subscription.toJSON();
      const body = {
        name: subscriptionJSON.endpoint
      };

      subscription.unsubscribe();
      this._keyHasChanged = false;

      return fetch(`${PushHandler.REMOTE_SERVER}/remove`, {
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(body)
      }).then(_ => {
        return idbKeyval.keys().then(keys => {
          return Promise.all(
            keys.map(k => idbKeyval.delete(k))
          );
        });
      }).then(_ => {
        console.log('Removed subscription.');
        PushHandler.updateCurrentView();
        PushControls.updateListing();
        PushHandler._enableButtons('button[data-id]');
        Toast.create('Unsubscribed successfully.', {
          tag: 'all'
        });
        this._waiting = false;
      }).catch(_ => {
        console.log('Failed to remove all.');
        PushHandler.updateCurrentView();
        PushControls.updateListing();
        PushHandler._enableButtons('button[data-id]');
        Toast.create('Unable to update.', {
          tag: 'all'
        });
        this._waiting = false;
      });
    });
  }

  static _getSubscription () {
    return navigator.serviceWorker.ready.then(registration => {
      return registration.pushManager.getSubscription().then(subscription => {
        if (subscription && !this._keyHasChanged) {
          return subscription;
        }

        return idbKeyval.set('appkey', this._keyString).then(_ => {
          if (typeof window.ga === 'function') {
            window.ga('send', 'event', 'subscription', 'added');
          }

          return registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this._key
          }).catch(_ => {
            console.log('Subscription rejected');
            PushHandler._shutdown();
            return null;
          });
        });
      });
    });
  }

  static updateSubscriptions (values) {
    if (this._waiting) {
      // TODO: update the UI?
      return Promise.resolve();
    }

    this._waiting = true;

    return this._getSubscription().then(subscription => {
      const subscriptionJSON = subscription.toJSON();
      const body = {
        name: subscriptionJSON.endpoint,
        subscription: subscriptionJSON
      };

      values.forEach(value => {
        body[value.id] = value.subscribed;
      });

      return fetch(`${PushHandler.REMOTE_SERVER}/subscribe`, {
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(body)
      }).then(_ => {
        console.log('Subscriptions updated');
        return Promise.all(
          values.map(v => idbKeyval.set(v.id, v.subscribed))
        ).then(_ => {
          this._waiting = false;
        });
      });
    });
  }
}
