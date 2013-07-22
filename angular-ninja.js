/**
 * Ninja Blocks Angular Helpers
 */

var ninjaDebug = debug("ninja");


var NINJAAPPNAME = "NinjaBlocks";

angular.module(NINJAAPPNAME, []);

/**
 * Ninja Events
 * ------------
 *
 * List of events broadcast by the Ninja Blocks angular module/app
 */
angular.module(NINJAAPPNAME).value('NBEvents', {
  UserLoaded:               'UserLoaded',

  DevicesLoaded:            'DevicesLoaded',
  DeviceAdded:              'DeviceAdded',
  BlocksLoaded:             'BlocksLoaded',
  VendorDevicesLoaded:      'VendorDevicesLoaded',

  PusherHeartbeat:          'PusherHeartbeat',
  PusherData:               'PusherData',
  PusherConfig:             'PusherConfig',
  PusherStream:             'PusherStream',

  UpdateDashboardSettings:  'UpdateDashboardSettings',
  DashboardSettingsUpdated: 'DashboardSettingsUpdated',

  // WIDGET
  WidgetOptionsLoaded:      'WidgetOptionsLoaded',

  WidgetsLoaded:            'WidgetsLoaded',
  WidgetDeleted:            'WidgetDeleted',
  WidgetAdded:              'WidgetAdded',
  SelectWidget:             'SelectWidget',

  ViewCodeUpdated:          'ViewCSSUpdated',

  SelectWidgetDevices:      'SelectWidgetDevices',
  UnselectWidgetDevices:    'UnselectWidgetDevices',
  DeviceShowInfo:           'DeviceShowInfo',
  WidgetHighlightDevice:    'WidgetHighlightDevice',

  // SIDEBAR DEVICES
  ActivateDeviceAssign:     'ActivateDeviceAssign',
  FinishDeviceAssign:       'FinishDeviceAssign',

  // PACKERY
  PackeryAddDraggabilly:    'PackeryAddDraggabilly',
  PackerySortUpdated:       'PackerySortUpdated',
  PackeryReLayout:          'PackeryReLayout',
  PackeryDestroy:           'PackeryDestroy',
  DraggabillyEnable:         'DragabillyEnable',
  DraggabillyDisable:        'DragabillyDisable',

  // GRIDSTER
  AddWidget:                'AddWidget',
  GridsterRefresh:          'GridsterRefresh'
});



/**
 * Ninja User
 * ----------
 * Handle Ninja Block User account. 
 * Session is handled by 
 */
angular.module(NINJAAPPNAME).service('NBUser', ['$rootScope', '$http', 'NBEvents'
  , function($rootScope, $http, NBEvents) {

    var ninjaUser = {

      User: {},

      DashboardSettings: {},

      Load: function(callback) {
        $http.get("/rest/v0/user").success(function(response) {
          this.User = response;
          $rootScope.$broadcast(NBEvents.UserLoaded, this.User);
          if (callback) callback(response);
        }.bind(this));
      },

      CleanPreferences: function(preferences) {
        _.each(preferences.Widgets, function(widget,guid) {
          if (preferences.Widgets[guid].hasOwnProperty("Devices")) {
            // Transform
            preferences.Widgets[guid].devices = angular.copy(preferences.Widgets[guid].Devices);
            preferences.Widgets[guid].view = angular.copy(preferences.Widgets[guid].View);
            preferences.Widgets[guid].view.gistUrl = angular.copy(preferences.Widgets[guid].View.GistUrl);
            preferences.Widgets[guid].view.source = angular.copy(preferences.Widgets[guid].View.Source);
            preferences.Widgets[guid].view.source.html = angular.copy(preferences.Widgets[guid].View.Source.HTML);
            preferences.Widgets[guid].view.source.css = angular.copy(preferences.Widgets[guid].View.Source.CSS);
            preferences.Widgets[guid].view.source.js = angular.copy(preferences.Widgets[guid].View.Source.JS);
            preferences.Widgets[guid].settings = angular.copy(preferences.Widgets[guid].Settings);

            // Delete nodes
            delete preferences.Widgets[guid].Devices;
            delete preferences.Widgets[guid].View;
            delete preferences.Widgets[guid].view.Source;
            delete preferences.Widgets[guid].view.GistUrl;
            delete preferences.Widgets[guid].Settings;
            delete preferences.Widgets[guid].settings.Name;
            delete preferences.Widgets[guid].settings.SizeX;
            delete preferences.Widgets[guid].settings.SizeY;
            delete preferences.Widgets[guid].settings.SortOrder;
            delete preferences.Widgets[guid].settings.GistUrl;
          }

        });

        return preferences;
      },

      LoadPreferences: function(callback) {
        $http.get("/dashboard/settings").success(function(response) {
          this.DashboardSettings = (response === "null") ? {} : this.CleanPreferences(response);
          // this.DashboardSettings = (response === "null") ? {} : response;
          $rootScope.$broadcast(NBEvents.DashboardSettingsUpdated, this.DashboardSettings);
          ninjaDebug("DashboardSettings", this.DashboardSettings);
          if (callback) callback(this.DashboardSettings);
        }.bind(this));
      },

      SavePreferences: _.debounce(function(callback) {
        $http.put("/dashboard/settings", this.DashboardSettings).success(function(response) {
          $rootScope.$broadcast(NBEvents.DashboardSettingsSaved, this.DashboardSettings);
          if (callback) callback();
        }.bind(this));
      }, 500),

      AddWidget: function(widget, insertIndex, callback) {

        if (angular.isNumber(insertIndex)) {
          this.DashboardSettings.Widgets.splice(insertIndex, 0, widget);
        } else {
          this.DashboardSettings.Widgets.push(widget);
        }

        $rootScope.$broadcast(NBEvents.WidgetAdded, widget);
      }


    };

    $rootScope.$on(NBEvents.UpdateDashboardSettings, function(event) {
      ninjaUser.SavePreferences();
    });

    return ninjaUser;
  }]);


angular.module(NINJAAPPNAME).service('NBUserBlocks', ['$rootScope', '$http', 'NBEvents'
  , function($rootScope, $http, NBEvents) {

    var blocks = {

      Blocks: [],

      Load: function(callback) {
        $http.get("/rest/v0/block").success(function(response) {
          this.Blocks = response.data;
          $rootScope.$broadcast(NBEvents.BlocksLoaded, this.Blocks);
          if (callback) callback(response);
        }.bind(this));
      }

    };

    return blocks;

  }]);

/**
 * Ninja Devices
 * -------------
 *
 * Load Ninja Block devices for a user account
 */
angular.module(NINJAAPPNAME).service('NBUserDevices', ['$rootScope', '$http', 'NBEvents'
  , function($rootScope, $http, NBEvents) {

    var devices = {

      Devices: [],

      // AJAX Load User Devices
      Load: function(callback) {
        $http.get("/rest/v0/device").success(function(response) {
          this.Devices = response.data;
          $rootScope.$broadcast(NBEvents.DevicesLoaded, this.Devices);
          if (callback) callback(response);
        }.bind(this));
      },

      LoadDevice: function(guid, callback) {
        $http.get("/rest/v0/device/" + guid).success(function(response) {
          if (response.result) {
            if (callback) {
              callback(response.data)
            }
          } else {
            // Could not load device;
          }
        }.bind(this)).error(function(response) {
          ninjaDebug("Error loading Device", guid, response);
        }.bind(this));
      },

      AddDevice: function(guid, device) {
        this.Devices[guid] = device;
        // console.log("Device Added", device, this.Devices);
        $rootScope.$broadcast(NBEvents.DeviceAdded, device);
      }

    };

    $rootScope.$on(NBEvents.PusherData, function(event, data) {
      // Pusher event received. Check if device exists in Devices array

      if (!devices.Devices.hasOwnProperty(data.GUID)) {
        // Load the device and add to Devices
        devices.LoadDevice(data.GUID, function(device) {
          devices.AddDevice(data.GUID, device);
        });
      }

    });

    return devices;
  }]);


/**
 * Load Ninja Block devices for a vendor
 */
angular.module(NINJAAPPNAME).service('NBVendorDevices', ['$rootScope', '$http', 'NBEvents'
  , function($rootScope, $http, NBEvents) {


    var vendorDevices = {

      Devices: [],

      Load: function(callback) {
        $http.get("/js/vendor_devices.json").success(function(response) {
          this.Devices = response.data;
          $rootScope.$broadcast(NBEvents.VendorDevicesLoaded, this.Devices);
          if (callback) callback(response);
        }.bind(this));
      },

      GetVendorDevice: function(deviceId, vendorId) {

        vendorId = vendorId || 0;

        var device = _.find(this.Devices, function(device) {
          var found = parseInt(device.did, 10) === parseInt(deviceId, 10)
                   && parseInt(device.vid, 10) === parseInt(vendorId, 10);
          return found;
        });

      },

      /**
       * Gets the device type for the specified device
       * @param  {[type]} deviceId [description]
       * @return {[type]}          [description]
       */
      GetDeviceTypeForDevice: function(deviceId, vendorId) {
        vendorId = vendorId || 0;

        var device = this.GetVendorDevice(deviceId, vendorId);

        return device.device_type;
      }
      
    };

    return vendorDevices;

  }]);


/**
 * Ninja Pusher
 * ------------
 *
 * Ninja User account connecting to their pusher channel
 */
angular.module(NINJAAPPNAME).service('NBPusher', ['$rootScope', 'NBEvents'
  , function($rootScope, NBEvents) {

    var pusher = {

      Options: {
        Key: '',
        Channel: ''
      },

      Pusher: null,

      PusherChannel: null,

      Connect: function() {
        ninjaDebug("Pusher Connecting");

        this.Pusher = new Pusher(this.Options.Key);
        this.PusherChannel = this.Pusher.subscribe(this.Options.Channel);

        this.Pusher.log = function(message) { ninjaDebug(message); };


        this.PusherChannel.bind('heartbeat', this.Heartbeat_Handler);
        this.PusherChannel.bind('data', this.Data_Handler);
        this.PusherChannel.bind('stream', this.Stream_Handler);
        this.PusherChannel.bind('config', this.Config_Handler);

      },

      Disconnect: function() {
        ninjaDebug("Pusher Disconnecting");
        this.Pusher.disconnect();
      },


      Heartbeat_Handler: function(data) {
        $rootScope.$broadcast(NBEvents.PusherHeartbeat, data);
        $rootScope.$apply();
      },

      Data_Handler: function(data) {
        $rootScope.$broadcast(NBEvents.PusherData, data);
        $rootScope.$apply();
      },

      Stream_Handler: function(data) {
        $rootScope.$broadcast(NBEvents.PusherStream, data);
        $rootScope.$apply();
      },

      Config_Handler: function(data) {
        switch (data.type) {
          case "NODE_ACTIVATION":
            break;
          case "PLUGIN":
            // $rootScope.$broadcast(NBEvents.DevicePlugin, data);
            break;
          case "UNPLUG":
            // $rootScope.$broadcast(NBEvents.DeviceUnplug, data);
            break;
          default:
            // $rootScope.$broadcast(NBEvents.PusherConfig, data);
        }

      }
    };

    return pusher;

}])