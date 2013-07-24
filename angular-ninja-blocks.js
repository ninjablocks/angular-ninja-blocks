/**
 * Ninja Blocks Angular Helpers
 */


;function() {

  // Check for visionmedia/debug
  var ninjaDebug = (debug) ? debug("ninja:angular") : console.log;

  // Module name
  var MODULE = "angular-ninja-blocks";

  /**
   * Ninja Events
   */
  angular.module(MODULE).value('NBEvents', {

    // Pusher


  });

  /**
   * Ninja Pusher
   * ------------
   * Pusher Service events
   */
  angular.module(MODULE).service('NBPusher', ['$rootScope', 'NBEvents'
    , function($rootScope, NBEvents) {

      // Events
      NBEvents.PusherHeartbeat =         'PusherHeartbeat';
      NBEvents.PusherData =              'PusherData';
      NBEvents.PusherConfig =            'PusherConfig';
      NBEvents.PusherStream =            'PusherStream';

      // Service Object
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


  /**
   * Ninja User
   * ----------
   * Handle Ninja Block User account. 
   * Session is handled by 
   */
  angular.module(MODULE).service('NBUser', ['$rootScope', '$http', 'NBEvents'
    , function($rootScope, $http, NBEvents) {

      var endpoint = "/rest/v0/user";

      NBEvents.UserLoaded =         'Ninja.UserLoaded';

      var ninjaUser = {

        // The current user object
        User: {},

        /**
         * Load the user
         * @param  {Function} callback [description]
         * @return {[type]}            [description]
         */
        Load: function(callback) {
          $http.get(endpoint).success(function(response) {
            this.User = response;
            $rootScope.$broadcast(NBEvents.UserLoaded, this.User);
            if (callback) callback(response);
          }.bind(this));
        }

      };

      return ninjaUser;
    }]);

  /**
   * Ninja User Blocks
   * -----------------
   * Manage a user's blocks
   */
  angular.module(MODULE).service('NBUserBlocks', ['$rootScope', '$http', 'NBEvents'
    , function($rootScope, $http, NBEvents) {

      var endpoint = "/rest/v0/block"

      NBEvents.BlocksLoaded =       'Ninja.BlocksLoaded';

      var blocks = {

        Blocks: [],

        Load: function(callback) {
          $http.get(endpoint).success(function(response) {
            this.Blocks = response.data;
            $rootScope.$broadcast(NBEvents.BlocksLoaded, this.Blocks);
            if (callback) callback(response);
          }.bind(this));
        }

      };

      return blocks;

    }]);

  /**
   * Ninja User Devices
   * ------------------
   * Load Ninja Block devices for a user account
   */
  angular.module(MODULE).service('NBUserDevices', ['$rootScope', '$http', 'NBEvents'
    , function($rootScope, $http, NBEvents) {

      // Endpoint
      var endpoint = "/rest/v0/device";

      // Events
      NBEvents.DevicesLoaded =      'Ninja.DevicesLoaded';
      NBEvents.DeviceAdded =        'Ninja.DeviceAdded';
      NBEvents.DeviceLoaded =       'Ninja.DeviceLoaded';
      NBEvents.DeviceNotLoaded =    'Ninja.DeviceNotLoaded';

      // Service Object
      var devices = {

        Devices: [],

        /**
         * Load a user's devices
         * @param  {Function} callback [description]
         * @return {[type]}            [description]
         */
        Load: function(callback) {
          $http.get(endpoint).success(function(response) {
            this.Devices = response.data;
            $rootScope.$broadcast(NBEvents.DevicesLoaded, this.Devices);
            if (callback) callback(response);
          }.bind(this));
        },

        /**
         * Load a specific user device
         * @param  {string}   guid     The GUID of the device
         * @param  {Function} callback Callback function with the loaded device
         */
        LoadDevice: function(guid, callback) {
          $http.get(endpoint + "/" + guid).success(function(response) {
            if (response.result) {
              var device = response.data;
              if (callback) {
                callback(device)
              }
              $rootScope.$broadcast(NBEvents.DeviceLoaded, device);
            } else {
              $rootScope.$broadcast(NBEvents.DeviceNotLoaded, guid);
            }
          }.bind(this)).error(function(response) {
            $rootScope.$broadcast(NBEvents.DeviceNotLoaded, guid);
            ninjaDebug("Error loading Device", guid, response);
          }.bind(this));
        },

        /**
         * Add a device to the devices object hash
         * @param  {[type]} guid   [description]
         * @param  {[type]} device [description]
         * @return {[type]}        [description]
         */
        AddDevice: function(guid, device) {
          this.Devices[guid] = device;
          // console.log("Device Added", device, this.Devices);
          $rootScope.$broadcast(NBEvents.DeviceAdded, device);
        }

      };

      // Update a device's last_data when PusherData arrives
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


}();




