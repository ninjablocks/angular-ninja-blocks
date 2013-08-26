/**
 * Ninja Blocks Angular Helpers
 */


;(function () {

  // Check for visionmedia/debug
  var ninjaDebug = (typeof debug !== 'undefined') ? debug("ninja:angular") : function() { console.log(arguments); };

  // Module name
  var MODULE = "angular-ninja-blocks";


  /**
   * Defined the angular component module
   */
  angular.module(MODULE, []);

  /**
   * Ninja Events
   */
  angular.module(MODULE).value('NBEvents', {

      PusherHeartbeat:          'PusherHeartbeat',
      PusherData:               'PusherData',
      PusherConfig:             'PusherConfig',
      PusherStream:             'PusherStream',

      UserLoaded:               'Ninja.UserLoaded',
      UserNotLoaded:            'Ninja.UserNotLoaded',

      BlocksLoaded:             'Ninja.BlocksLoaded',

      DevicesLoaded:            'Ninja.DevicesLoaded',
      DeviceAdded:              'Ninja.DeviceAdded',
      DeviceLoaded:             'Ninja.DeviceLoaded',
      DeviceNotLoaded:          'Ninja.DeviceNotLoaded'

  });

  angular.module(MODULE).service('NBAPI', function() {

    var api = {

      /**
       * The Ninja API host
       * @type {String}
       */
      Host:                 'https://api.ninja.is',

      /**
       * Authentication Modes
       * @type {Object}
       */
      AuthenticationModes: {
        ACCESS_TOKEN:       'accessToken',
        USER_ACCESS_TOKEN:  'userAccessToken',
        SESSION:            'session'
      },

      /**
       * The user_access_token
       * @type {String}
       */
      userAccessToken:      '',

      /**
       * The OAuth 2.0 access token
       * @type {String}
       */
      accessToken:     '',

      /**
       * Detects the Authentication Mode
       * @return {[type]} [description]
       */
      GetAuthenticationMode: function() {

        if (this.userAccessToken) return this.AuthenticationModes.USER_ACCESS_TOKEN;
        if (this.oauthAccessToken) return  this.AuthenticationModes.ACCESS_TOKEN;
        return this.AuthenticationModes.SESSION;

      },

      /**
       * Gets the auth slug for REST requests
       * @param  {boolean} append Whether to append the auth slug to existing querystring or create new querystring
       * @return {string}        Query string of the auth slug
       */
      GetAuthSlug: function(append) {
        
        var appendChar = (append) ? '&' : '?';

        var mode = this.GetAuthenticationMode();

        switch (mode) {
          case this.AuthenticationModes.ACCESS_TOKEN:
            return appendChar + 'access_token=' + this.accessToken;
            break;
          case this.AuthenticationModes.USER_ACCESS_TOKEN:
            return appendChar + 'user_access_token=' + this.userAccessToken;
            break;
          case this.AuthenticationModes.SESSION:
            return '';
            break;
          default:
            return '';
        }

      }

    };

    return api;

  })

  /**
   * Ninja Pusher
   * ------------
   * Pusher Service events
   */
  angular.module(MODULE).service('NBPusher', ['$rootScope', 'NBEvents', 'NBAPI'
    , function($rootScope, NBEvents, NBAPI) {

      // Events


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
  angular.module(MODULE).service('NBUser', ['$rootScope', '$http', 'NBEvents', 'NBAPI'
    , function($rootScope, $http, NBEvents, NBAPI) {

      var endpoint = "/rest/v0/user";


      var ninjaUser = {

        // The current user object
        User: {},

        /**
         * Load the user
         * @param  {Function} callback [description]
         * @return {[type]}            [description]
         */
        Load: function(callback) {
          $http.get(NBAPI.Host + endpoint + NBAPI.GetAuthSlug()).success(function(response, status) {
            switch(status) {
              case 200:
                this.User = response;
                $rootScope.$broadcast(NBEvents.UserLoaded, this.User);
                if (callback) callback(response);
                break;

              case 401:
                this.User = {}
                $rootScope.$broadcast(NBEvents.UserNotLoaded);
                if (callback) callback(false);
                break;
            }
          }.bind(this)).error(function(response) {
            $rootScope.$broadcast(NBEvents.UserNotLoaded);
            if (callback) callback(false);
          });
        }

      };

      return ninjaUser;
    }]);

  /**
   * Ninja User Blocks
   * -----------------
   * Manage a user's blocks
   */
  angular.module(MODULE).service('NBUserBlocks', ['$rootScope', '$http', 'NBEvents', 'NBAPI'
    , function($rootScope, $http, NBEvents, NBAPI) {

      var endpoint = "/rest/v0/block";


      var blocks = {

        Blocks: [],

        Load: function(callback) {
          $http.get(NBAPI.Host + endpoint + NBAPI.GetAuthSlug()).success(function(response, status) {
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
  angular.module(MODULE).service('NBUserDevices', ['$rootScope', '$http', 'NBEvents', 'NBAPI'
    , function($rootScope, $http, NBEvents, NBAPI) {

      // Endpoint
      var endpoint = "/rest/v0/device";


      // Service Object
      var devices = {

        Devices: {},

        /**
         * Load a user's devices
         * @param  {Function} callback [description]
         * @return {[type]}            [description]
         */
        Load: function(callback) {
          $http.get(NBAPI.Host + endpoint + NBAPI.GetAuthSlug()).success(function(response, status) {
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
          $http.get(NBAPI.Host + endpoint + "/" + guid + NBAPI.GetAuthSlug()).success(function(response, status) {
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


})(undefined);




