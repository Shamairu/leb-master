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

export class LiveBanner {

  static toggle () {
    var timeNow = Date.now();
    var confStartTime = Date.parse('2016-11-10T07:30:00-08:00');
    var confEndTime = Date.parse('2016-11-11T18:00:00-08:00');
    var isInConference = timeNow > confStartTime && timeNow < confEndTime;
    var showLiveHeader = isInConference &&
        window.location.pathname !== '/devsummit/';

    var masthead = document.querySelector('.masthead');
    var header = document.querySelector('.header');
    var headerLiveStream = document.querySelector('.header__live-stream');

    if (showLiveHeader) {
      masthead.classList.add('masthead--live');
      header.classList.add('header--live');
      headerLiveStream.classList.add('visible');
      headerLiveStream.removeAttribute('aria-hidden');
    } else {
      masthead.classList.remove('masthead--live');
      header.classList.remove('header--live');
      headerLiveStream.classList.remove('visible');
      headerLiveStream.setAttribute('aria-hidden', true);
    }
  }
}
