(function() {
  'use strict';

  angular
    .module('ionic-search-model', [])
    .directive('searchModal', function ($ionicModal, $http, $q, $templateCache) {
      return {
        restrict: 'A',
        scope: {
          templateUrl: '@',
          ngModel: '=?',
          placeholder: '@',
          searchList: '=?',
          searchKey: '@',
          displayProperty: '@',
          rightIcon: '@',
          leftIcon: '@',
          leftImage: '@',
          itemClicked: '&',
          remoteUrl: '@',
          modelClosed: '&',
          customClass: '@',
          addCustomItem: '@'

        },
        link: function ($scope, element) {
          console.log('Search Modal Initialized!', $scope.searchList);
          $scope.searchQuery = "";
          var httpCanceller = null;
          $scope.searchLoading = false;
          var valueOrDefault = function (value, defaultValue) {
            return !value ? defaultValue : value;
          };


          var TEMPLATE_URL = '/ionic-search-model/index.html';
          $templateCache.put(TEMPLATE_URL,
            '<ion-modal-view class="modal-view">\n' +
            '  <ion-header-bar class="bar uzed-xbold font-size-15 uzed-gradient search-header" align-title="center">\n' +
            '    <button class="button back-button button-clear color-black" style="width:40px" ng-click="modal.remove()">\n' +
            '      <i class="icon icon-ic-back-arrow"></i>\n' +
            '    </button>\n' +
            '    <form ng-submit="submitModalInput()" class="col no-padding">\n' +
            '      <div class="item-input-wrapper search-box " name="google-search" style="margin: 3px 14px 0px 0px;" >\n' +
            '        <i class="icon icon-search placeholder-icon"></i>\n' +
            '        <input class="no-border" type="search" ng-model="searchQuery" ng-change="onSearch(searchQuery)" placeholder="{{placeholder}}">\n' +
            '        <ion-spinner icon="dots" class="line-height-14 spinner-light" ng-show="searchLoading"></ion-spinner>\n' +
            '        <button type="button" ng-click="searchQuery=\'\'" class="button button-clear autocomplete-clear-search icon ion-close-round"  ng-show="searchQuery.length && !searchLoading"></button>\n' +
            '      </div>\n' +
            '    </form>\n' +
            '  </ion-header-bar>\n' +
            '  <div class="bar bar-subheader" ng-if="ngModel">\n' +
            '    <div class="item col padding-horizontal item-icon-right item-icon-left font-size-12 {{customClass}} padding item-bordered flex-vcenter"\n' +
            '         style="border-bottom: 2px solid #f4f4f4;padding-left: 58px;padding-right: 55px"\n' +
            '    >\n' +
            '      <i class="font-size-20 icon ion-checkmark-circled balanced"  width="23px"></i>\n' +
            '      <div class="uzed-bold clip-desc line-2 no-margin line-height-18 text-wrap padding-right" style="height: auto" >{{ngModel}}</div>\n' +
            '      <div class="energized icon font-size-12 padding-horizontal" style="right: 5px" ng-click="clearField(ngModel)">Remove</div>\n' +
            '    </div>\n' +
            '  </div>\n' +
            '  <ion-content  has-bouncing="false" class="padding-horizontal" ng-class="{\'has-subheader\' : ngModel}">\n' +
            '    <div class="list " >\n' +
            '      <div class="item padding-horizontal item-icon-right font-size-12 {{customClass}} padding item-bordered flex-vcenter"\n' +
            '           ng-repeat="item in searchList | filter : searchFilter(searchQuery) as filteredItems" style="border-bottom: 2px solid #f4f4f4;"\n' +
            '           ng-click="selectItem(item)">\n' +
            '        <img ng-show="leftImage" hires="{{getLeftImage(item)}}"\n' +
            '             check-image="./img/image_placeholder.png" ng-src="./img/image_placeholder.png" class="margin-2"  width="23px">\n' +
            '        <div class="padding-horizontal  text-wrap" ng-class="{\'uzed-bold\' : ( item[displayProperty] === ngModel || item === ngModel)}">{{displayProperty ? item[displayProperty] : item}}</div>\n' +
            '        <i class="icon {{rightIcon || ( item[displayProperty] === ngModel || item === ngModel ? \'ion-checkmark-circled balanced\' : \'icon-ic-drop-down-right\')}} font-size-15" style="right: 0"></i>\n' +
            '      </div>\n' +
            '      <div class="item text-center padding-20" ng-show="!addCustomItem &&filteredItems.length<=0 && searchQuery.length!=\'\'">\n' +
            '        <div class="text-heading3">No Result!</div>\n' +
            '        <div class="text-primary"> <span class="energized">{{searchQuery}}</span> not found</div>\n' +
            '      </div>\n' +
            '\n' +
            '      <div class="font-size-12 item item-bordered padding text-center {{customClass}}"\n' +
            '           ng-show="addCustomItem && filteredItems.length<=0 && searchQuery.length!=\'\'"\n' +
            '           ng-click="addItemToList({name : searchQuery})">\n' +
            '        <span class="icon ion-plus font-size-15 icon-left"> Add new</span>\n' +
            '      </div>\n' +
            '    </div>\n' +
            '  </ion-content>\n' +
            '</ion-modal-view>'
            );

          $scope.templateUrl = valueOrDefault($scope.templateUrl, TEMPLATE_URL);

          element[0].addEventListener('click', function (event) {
            $scope.open();
          });

          function httpSuccessCallbackGen(str) {
            return function (responseData, status, headers, config) {
              // normalize return obejct from promise
              if (!status && !headers && !config && responseData.data) {
                responseData = responseData.data;
              }
              $scope.searchLoading = false;
              processResults(responseData);
            };
          }

          function httpErrorCallback(errorRes, status, headers, config) {
            $scope.searchLoading = false;

            // normalize return obejct from promise
            if (!status && !headers && !config) {
              status = errorRes.status;
            }

            // cancelled/aborted
            if (status === 0 || status === -1) {
              return;
            }
            else {
              if (console && console.error) {
                console.error('http error');
              }
            }
          }

          function cancelHttpRequest() {
            if (httpCanceller) {
              httpCanceller.resolve();
            }
          }

          function onSearch(str) {
            var params = {},
              url = $scope.remoteUrl + encodeURIComponent(str);
            cancelHttpRequest();
            console.log("SearchQuery", str);
            if ($scope.remoteUrl) {
              httpCanceller = $q.defer();
              params.timeout = httpCanceller.promise;
              $scope.searchLoading = true;
              $http.get(url, params)
                .then(httpSuccessCallbackGen(str))
                .catch(httpErrorCallback)
                .finally(function () {
                  $scope.searchLoading = false;
                });
            }
          }

          function processResults(responseData) {
            if (responseData && responseData.length > 0) {
              $scope.searchList = [];
              $scope.searchList = responseData;

            } else {
              $scope.searchList = [];
            }
          }

          function getLeftImage(item) {
            if (_.startsWith($scope.leftImage, "http")) {
              return $scope.leftImage;
            } else {
              return item[$scope.leftImage];
            }
          }

          $scope.$on('modal.hidden', function () {
            // Execute action
            $scope.modelClosed();

          });
          $scope.$on('$destroy', function () {
            $scope.$destroy();
            if ($scope.modal) $scope.modal.remove();
            console.log("Modal $destroy", "");
          });

          $scope.open = open;
          $scope.close = close;
          $scope.clearInput = clearInput;
          $scope.selectItem = selectItem;
          $scope.searchFilter = searchFilter;
          $scope.onSearch = onSearch;
          $scope.addItemToList = addItemToList;
          $scope.clearField = clearField;
          $scope.getLeftImage = getLeftImage;
          $scope.submitModalInput = submitModalInput;

          var filterBy = $scope.searchKey ? $scope.searchKey : ($scope.displayProperty ? $scope.displayProperty : null);

          function searchFilter(q) {
            var query = _.toLower(q);
            return function (item) {
              if (!filterBy) {
                return (_.toLower(item).indexOf(query) >= 0);
              } else
                return _.includes(_.toLower(item[filterBy]), query);
            };
          }

          function open() {
            $ionicModal.fromTemplateUrl($scope.templateUrl, {
              scope: $scope,
              focusFirstInput: true,
              animation: 'scale-in'
            }).then(function (modal) {
              $scope.modal = modal;
              $scope.onSearch("");
              modal.show();
            });
          }

          function close() {
            $scope.modal.hide();
            // $scope.closemodal({val:true});
          }

          function clearInput() {
            $scope.searchQuery = "";
            $scope.searchList = [];
          }

          function selectItem(item) {
            // $scope.clearInput();
            $scope.close();
            $scope.ngModel = $scope.displayProperty ? item[$scope.displayProperty] : item;
            $scope.itemClicked({item: item});
          }

          function addItemToList(newItem) {
            $scope.searchList.push(newItem);
            $scope.selectItem(newItem);
          }

          function clearField(item) {
            $scope.selectItem("");
          }

          function submitModalInput() {
            if (window.cordova) {
              cordova.plugins.Keyboard.close();
            }
          }

        }
      };
    });
}());

