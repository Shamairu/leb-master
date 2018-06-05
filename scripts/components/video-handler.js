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

export class VideoHandler {

  static get STATES () {
    return {
      STABLE: 1,
      GOING_TO_BIG_PLAYER: 2,
      GOING_TO_SMALL_PLAYER: 3
    };
  }

  static get state () {
    if (!this._state) {
      this._state = VideoHandler.STATES.STABLE;
    }

    return this._state;
  }

  static set state (_state) {
    this._state = _state;
  }

  static handle (youtubeVideoElement) {
    var youtubeId = youtubeVideoElement &&
        youtubeVideoElement.getAttribute('data-youtube-id');
    var playingVideo = document.querySelector('iframe.youtube-video-player__thumb');
    var link = youtubeVideoElement &&
        youtubeVideoElement.querySelector('a');

    if (playingVideo) {
      var playingVideoContainer = playingVideo.parentNode;
      if (youtubeId && window.location.href !== playingVideoContainer.dataset.href) {
        // Different video, embed the link...
        console.log('Different video (' + youtubeId + '), embed the link.');
        VideoHandler.embedLink(youtubeId, link);
      } else {
        // Dismiss any players besides the current one.
        VideoHandler._removeVideoPlayers(playingVideoContainer.dataset.youtubeId);
      }
    } else if (youtubeVideoElement) {
      // Embed the link to the new video...
      console.log('Embed the link to the new video.');
      VideoHandler.embedLink(youtubeId, link);
    } else {
      // Dismiss video.
      console.log('Dismiss video because playingVideo = ', playingVideo);
      VideoHandler._removeVideoPlayers();
    }
  }

  static toggleSmallPlayerIfNeeded () {
    var playingVideo = document.querySelector('iframe.youtube-video-player__thumb');
    if (!playingVideo) {
      return;
    }

    var playingVideoContainer = playingVideo.parentNode;

    if (window.location.href === playingVideoContainer.dataset.href) {
      console.log('Already playing this video, remove small-player');
      VideoHandler.disableSmallPlayer(playingVideoContainer);
    } else {
      console.log('Enabling small-player');
      VideoHandler.enableSmallPlayer(playingVideoContainer);
    }
  }

  static enableSmallPlayer (playingVideoContainer) {
    VideoHandler.state = VideoHandler.STATES.GOING_TO_SMALL_PLAYER;

    // First.
    var first = playingVideoContainer.getBoundingClientRect();

    // Last.
    playingVideoContainer.classList.remove('youtube-video-player--small-player-animatable');
    playingVideoContainer.classList.add('youtube-video-player--small-player');
    playingVideoContainer.style.position = 'fixed';
    playingVideoContainer.style.bottom = '32px';
    playingVideoContainer.style.right = '32px';
    playingVideoContainer.style.left = 'auto';
    playingVideoContainer.style.top = 'auto';
    playingVideoContainer.style.transform = 'scale(0.4)';
    var last = playingVideoContainer.getBoundingClientRect();

    // Invert.
    var x = first.right - last.right;
    var y = first.bottom - last.bottom;
    var s = first.width / last.width;

    playingVideoContainer.style.transform =
        'translate(' + x + 'px, ' + y + 'px) scale(' + s + ') scale(0.4)';

    // Wait a frame for the translate to take hold.
    requestAnimationFrame(function () {
      if (VideoHandler.state === VideoHandler.STATES.GOING_TO_BIG_PLAYER) {
        return;
      }

      // Now wait another frame before enabling animations.
      requestAnimationFrame(function () {
        if (VideoHandler.state === VideoHandler.STATES.GOING_TO_BIG_PLAYER) {
          return;
        }

        playingVideoContainer.classList.add('youtube-video-player--small-player-animatable');

        requestAnimationFrame(function () {
          if (VideoHandler.state === VideoHandler.STATES.GOING_TO_BIG_PLAYER) {
            return;
          }

          // Now scale down the player.
          playingVideoContainer.style.transform =
              'scale(0.4)';
          playingVideoContainer.addEventListener('transitionend',
                VideoHandler._onTransitionEndToSmall);
        });
      });
    });
  }

  static disableSmallPlayer (playingVideoContainer) {
    VideoHandler.state = VideoHandler.STATES.GOING_TO_BIG_PLAYER;
    var first = playingVideoContainer.getBoundingClientRect();

    // Remove all the styles added by going to small-player.
    playingVideoContainer.removeAttribute('style');
    playingVideoContainer.classList.remove('youtube-video-player--small-player');
    playingVideoContainer.classList.remove('youtube-video-player--small-player-animatable');

    var last = playingVideoContainer.getBoundingClientRect();
    var existingTransform =
        window.getComputedStyle(playingVideoContainer).transform;

    var x = first.right - last.right;
    var y = first.bottom - last.bottom;
    var s = first.width / last.width;

    playingVideoContainer.classList.add('youtube-video-player--small-player');
    playingVideoContainer.style.transform =
        existingTransform +
        'translate(' + x + 'px, ' + y + 'px) scale(' + s + ')';

    // Wait a frame for the translate to take hold.
    requestAnimationFrame(function () {
      if (VideoHandler.state === VideoHandler.STATES.GOING_TO_SMALL_PLAYER) {
        return;
      }

      // Now wait another frame before enabling animations.
      requestAnimationFrame(function () {
        if (VideoHandler.state === VideoHandler.STATES.GOING_TO_SMALL_PLAYER) {
          return;
        }

        playingVideoContainer.classList.add('youtube-video-player--small-player-animatable');

        // Wait again for the animations to be switched on...
        requestAnimationFrame(function () {
          if (VideoHandler.state === VideoHandler.STATES.GOING_TO_SMALL_PLAYER) {
            return;
          }

          // Now scale up the player.
          playingVideoContainer.removeAttribute('style');
          playingVideoContainer.addEventListener('transitionend',
                VideoHandler._onTransitionEndFromSmall);
        });
      });
    });
  }

  static _onTransitionEndFromSmall (evt) {
    evt.target.removeEventListener('transitionend',
        VideoHandler._onTransitionEndFromSmall);
    evt.target.classList.remove('youtube-video-player--small-player');
    evt.target.classList.remove('youtube-video-player--small-player-animatable');
    VideoHandler.state = VideoHandler.STATES.STABLE;
  }

  static _onTransitionEndToSmall (evt) {
    evt.target.removeEventListener('transitionend',
        VideoHandler._onTransitionEndToSmall);
    evt.target.classList.remove('youtube-video-player--small-player-animatable');
    VideoHandler.state = VideoHandler.STATES.STABLE;
  }

  static _removeVideoPlayers (youtubeIdToRetain) {
    var videoPlayers = document.querySelectorAll('.youtube-video-player');
    for (var i = 0; i < videoPlayers.length; i++) {
      if (videoPlayers[i].dataset.youtubeId === youtubeIdToRetain) {
        continue;
      }

      videoPlayers[i].parentNode.removeChild(videoPlayers[i]);
    }
  }

  static _getVideoPlayer (youtubeId) {
    console.log('Getting video player for ' + youtubeId);
    var masthead = document.querySelector('.masthead');
    var videoPlayer = document.querySelector(
        '.youtube-video-player[data-youtube-id="' + youtubeId + '"]');

    if (videoPlayer) {
      videoPlayer.innerHTML = '';
    } else {
      videoPlayer = document.createElement('div');
      videoPlayer.classList.add('youtube-video-player');
      videoPlayer.dataset.youtubeId = youtubeId;
      masthead.parentNode.insertBefore(videoPlayer, masthead);
    }

    return videoPlayer;
  }

  static embedLink (youtubeId, link) {
    var videoPlayer = VideoHandler._getVideoPlayer(youtubeId);

    if (!link) {
      console.warn('Expected link for ', youtubeId);
      return;
    }

    videoPlayer.appendChild(link);
  }

  static beginPlayback (youtubeURL) {
    var youtubeId = /\?v=([^\/&]+)/.exec(youtubeURL)[1];
    var videoPlayer = VideoHandler._getVideoPlayer(youtubeId);
    var iframe = document.createElement('iframe');
    var videoLink = document.createElement('a');

    iframe.classList.add('youtube-video-player__thumb');
    iframe.src = 'https://www.youtube.com/embed/' + youtubeId + '?autoplay=1';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', 'true');

    videoPlayer.classList.add('youtube-video-player--opacity-locked');
    videoPlayer.appendChild(iframe);
    videoPlayer.dataset.href = window.location.href;

    // Append a link so people can get back to the page where the video's
    // embedded, meaning it goes back to the big size.
    videoLink.href = window.location.href;
    videoLink.classList.add('youtube-video-player__link');
    videoPlayer.appendChild(videoLink);

    VideoHandler._removeVideoPlayers(youtubeId);
  }
}
