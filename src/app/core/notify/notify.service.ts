import {Injectable} from '@angular/core';
import {NotifyModel} from './notify.model';
import {environment} from '../../../environments/environment';
import {IS_ELECTRON} from '../../app.constants';
import {IS_MOBILE} from '../../util/is-mobile';
import {TranslateService} from '@ngx-translate/core';
import {ElectronService} from '../electron/electron.service';
import {UiHelperService} from '../../features/ui-helper/ui-helper.service';
import {IS_ANDROID_WEB_VIEW} from '../../util/is-android-web-view';
import {androidInterface} from '../android/android-interface';

@Injectable({
  providedIn: 'root',
})
export class NotifyService {
  constructor(
    private _electronService: ElectronService,
    private _translateService: TranslateService,
    private _uiHelperService: UiHelperService,
  ) {
  }

  async notifyDesktop(options: NotifyModel) {
    if (!IS_MOBILE) {
      return this.notify(options);
    }
  }

  async notify(options: NotifyModel): Promise<Notification> {
    const title = this._translateService.instant(options.title, options.translateParams);
    const body = options.body && this._translateService.instant(options.body, options.translateParams);

    const svcReg = this._isServiceWorkerAvailable() && await navigator.serviceWorker.getRegistration('ngsw-worker.js');

    if (svcReg && svcReg.showNotification) {
      await svcReg.showNotification(title, {
        icon: 'assets/icons/icon-128x128.png',
        vibrate: [100, 50, 100],
        silent: false,
        data: {
          dateOfArrival: Date.now(),
          primaryKey: 1
        },
        ...options,
        body,
      });
    } else if (IS_ANDROID_WEB_VIEW) {
      androidInterface.showNotification(title || 'NO_TITLE', body);
    } else if (this._isBasicNotificationSupport()) {
      const permission = await Notification.requestPermission();
      // not supported for basic notifications so we delete them
      delete options.actions;
      if (permission === 'granted') {
        const instance = new Notification(title, {
          icon: 'assets/icons/icon-128x128.png',
          vibrate: [100, 50, 100],
          silent: false,
          data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
          },
          ...options,
          body,
        });
        instance.onclick = () => {
          instance.close();
          if (IS_ELECTRON) {
            this._uiHelperService.focusApp();
          }
        };
        setTimeout(() => {
          instance.close();
        }, options.duration || 10000);
        return instance;
      } else {
        console.warn('No notifications supported');
        return null;
      }
    }
  }

  private _isBasicNotificationSupport(): boolean {
    return 'Notification' in window;
  }

  private _isServiceWorkerAvailable(): boolean {
    return 'serviceWorker' in navigator && environment.production && !IS_ELECTRON;
  }
}
