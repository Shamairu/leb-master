/**
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

import {Toast} from './components/toast';
import {PushHandler} from './components/push-handler';

export function installServiceWorker () {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported - aborting');
    return;
  }

  var currentVersion = null;

  navigator.serviceWorker.onmessage = function (evt) {
    if (typeof evt.data.version !== 'undefined') {
      if (currentVersion === null) {
        currentVersion = evt.data.version;
      } else {
        var newVersion = evt.data.version;
        var cvParts = currentVersion.split('.');
        var nvParts = newVersion.split('.');

        if (cvParts[0] === nvParts[0]) {
          console.log('Service Worker moved from ' +
                    currentVersion + ' to ' + newVersion);
        } else {
          Toast.create('Site updated. Refresh to get the latest!');
        }
      }
    }
  };

  navigator.serviceWorker.ready.then(function (registration) {
    if (!('pushManager' in registration)) {
      return;
    }

    PushHandler.init();
  });

  navigator.serviceWorker.register('/devsummit/sw.js').then(function (registration) {
    if (registration.active) {
      registration.active.postMessage('version');
    }

    // We should also start tracking for any updates to the Service Worker.
    registration.onupdatefound = function () {
      console.log('A new version has been found... Installing...');

      // If an update is found the spec says that there is a new Service Worker
      // installing, so we should wait for that to complete then show a
      // notification to the user.
      registration.installing.onstatechange = function () {
        if (this.state === 'installed') {
          return console.log('App updated');
        }

        if (this.state === 'activated') {
          registration.active.postMessage('version');
        }

        console.log('Incoming SW state:', this.state);
      };
    };
  });
}
