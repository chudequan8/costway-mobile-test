$(document).ready(function () {

    var memorhomeHost = 'pre';
    var sessionId = '';
    var clientType = 'h5';
    var cdTime = null;
    var timer = null;
    var isH5 = true;
    var version = null;
    var pageInfo = {};

    var tools = {
        testPhone: function (phone) {
            if (phone == '') {
                this.showMsg('请输入手机号');
                return false;
            }
            if (/^1([358][0-9]|4[579]|66|7[0135678]|9[89])[0-9]{8}$/.test(phone) == false) {
                this.showMsg('请输入正确的手机号');
                return false;
            }
            return true;
        },
        testCode: function (code) {
            if (!code) {
                this.showMsg('验证码不能为空');
                return false;
            }
            if (code.length !== 6) {
                this.showMsg('请输入正确的验证码');
                return false;
            }
            return true;
        },
        dateFormat: function (t) {
            var d = new Date(t);
            var year = d.getFullYear();
            var month = d.getMonth() + 1;
            var date = d.getDate();
            month = month < 10 ? '0' + month : month;
            date = date < 10 ? '0' + date : date;
            return year + '/' + month + '/' + date;
        },
        sendReq: function (url, params, callback) {
            if (!url || !params) {
                alert('参数不全！');
                return;
            }
            var baseParams = {
                "reqId": "h5",
                "timestamp": new Date()
            };
            params = $.extend({}, baseParams, params);
            $.ajax({
                type: 'post',
                url: 'https://' + memorhomeHost + '.mdguanjia.com' + url,
                // url: 'http://192.168.5.189:8080' + url,
                contentType: "application/json; charset=utf-8",
                dataType: 'json',
                data: JSON.stringify(params),
                success: function (data) {
                    if (callback) {
                        callback(data);
                    }
                },
                error: function (data) {
                    tools.showMsg('网络连接失败，请重试');
                    return false;
                }
            });
        },
        showMsg: function (msg) {
            //提示
            layer.open({
                content: msg
                , skin: 'msg'
                , time: 2 //2秒后自动关闭
            });
        }
    }
    var api = {
        getCheckCode: function () {
            tools.sendReq('/myhome/api/customer', {
                "v": "2.3",
                "method": "sendCheckcode",
                "params": {
                    "devId": "h5",
                    "jpushId": "",
                    "mobile": $('.phone-input input').val() || "",
                }
            }, function (res) {
                if (res.code == 0) {
                    tools.showMsg('验证码发送成功，请查收');
                } else {
                    tools.showMsg(res.message || '网络连接失败，请重试');
                }
            })
        },
        login: function (callback) {
            tools.sendReq('/myhome/api/customer', {
                "v": "1.0",
                "method": "loginByVcode",
                "params": {
                    "devId": "h5",
                    "jpushId": "",
                    "mobile": $('.phone-input input').val(),
                    "vcode": $('.code-input input').val()
                }
            }, function (res) {
                callback(res);
            })
        },
        getCouponCode: function (callback) {
            tools.sendReq('/myhome/api/joinActivity', {
                "v": "",
                "method": "",
                "params": {
                    activityCode: 'MJGY20180508',
                    source: clientType,
                    sessionId: sessionId
                }
            }, function (res) {
                callback(res);
            })
        },
        getRoomList: function (callback) {
            tools.sendReq('/activity/landlord/graduationSeason', {
                "method": "list",
                "version": "1.0"
            }, function (res) {
                if (res.code == 0 && res.data) {
                    callback(res.data);
                } else {
                    tools.showMsg(res.message || '获取精选房源列表失败');
                }
            })
        }
    }
    var activity = {
        init: function () {
            this.getSearch();
        },
        bindEvent: function () {
            var _this = this;
            /*获取验证码*/
            $('.coupon-container').on('click', '.code-btn', function () {

                if (!tools.testPhone($('.phone-input input').val()) || cdTime > 0) {
                    return;
                }

                cdTime = 59;
                $('.code-btn').html(cdTime + '秒后重发').removeClass('btn-primary').addClass('btn-default');
                timer = setInterval(function () {
                    cdTime--;
                    $('.code-btn').html(cdTime + '秒后重发');
                    if (cdTime < 0) {
                        clearInterval(timer);
                        $('.code-btn').html('重发验证码').removeClass('btn-default').addClass('btn-primary');
                    }
                }, 1000);
                api.getCheckCode();
            })
            /*未登录登录后再领取优惠券，已登录直接领取优惠券*/
            $('.coupon-container').on('click', '.getCoupon-btn', function () {
                if (isH5) {
                    if (!tools.testPhone($('.phone-input input').val()) || !tools.testCode($('.code-input input').val())) {
                        return;
                    }
                    api.login(function (res) {
                        if (res.data && res.data.sessionId) {
                            sessionId = res.data.sessionId;
                            if (clientType == 'h5') {
                                try {
                                    localStorage.setItem('MLMHSHJSID', sessionId);
                                }
                                catch (err) {
                                    console.log(err.message);
                                }
                            }
                            api.getCouponCode(_this.renderCoupon);
                        } else {
                            tools.showMsg(res.message || '网络连接失败，请重试');
                        }
                    });
                    return;
                }
                if (sessionId) {
                    api.getCouponCode(_this.renderCoupon);
                    return;
                }
                if (clientType == 'android') {
                    try {
                        SetupJsCommunication.jumpToNativePages(JSON.stringify({
                            libCode: 5001,
                            subLibCode: null,
                            refresh: true,
                            params: {}
                        }));
                    }
                    catch (err) {
                        console.log(err.message);
                    }
                } else {
                    setupWebViewJavascriptBridge(function (bridge) {
                        bridge.callHandler('jumpToNativePages', {
                            libCode: 5001,
                            subLibCode: null,
                            refresh: true,
                            params: {}
                        }, function responseCallback(responseData) {
                            // window.location.href = "./index.html?sessionId=" + escape(responseData.sessionId) + '&clientType=' + responseData.clientType + '&version=3.4.0';
                        })
                    })
                }
            })
            /*app内跳到优惠券列表页，app外跳转到下载页*/
            $('.coupon-container').on('click', '.couponCode', function () {
                if (isH5) {
                    window.location.href = 'https://www.mdguanjia.com/appdownload/index.html';
                    return;
                }
                if (clientType == 'ios') {
                    setupWebViewJavascriptBridge(function (bridge) {
                        bridge.callHandler('jumpToNativePages', {
                            libCode: 5013,
                            subLibCode: null,
                            refresh: false,
                            params: {}
                        }, function responseCallback(responseData) {
                        })
                    })
                } else {
                    SetupJsCommunication.jumpToNativePages(JSON.stringify({
                        libCode: 5013,
                        subLibCode: null,
                        refresh: false,
                        params: {}
                    }));
                }
            })
            /* 跳转到app引导下载页 */
            $('.coupon-container').on('click', '.download-link', function () {
                location.href = 'https://www.mdguanjia.com/appdownload/index.html';
            })
            // $('.coupon-container').on('click', '.showPhone', function () {
            //     localStorage.setItem('MLMHSHJSID', '');
            //     location.reload();
            // })
        },
        renderCoupon: function (res) {
            // code 0: 领取成功 6666: 活动过期
            if (res.code != 0 && res.code != 6666) {
                $('.getCoupon-group').removeClass('hide');
                tools.showMsg(res.message || '网络连接失败，请重试');
            } else {
                var html = '';
                if (res.code == 6666) {
                    html += '<div class="outDate">\
                                <img src="./images/end.png" alt="">\
                                <p>来晚了，活动已结束！</p>\
                            </div>';
                } else if (res.data && res.message) {
                    var data = res.data;
                    html += '<div class="couponCode-container">\
                                    <div class="couponCode">\
                                        <div class="count">\
                                            <span class="count-text">' + data.discountAmount + '</span>\
                                            <span>元</span>\
                                        </div>\
                                        <div class="content">\
                                            <div class="name-container">\
                                                <span class="tag">抵扣券</span>\
                                                <span class="name">' + data.couponName + '</span>\
                                            </div>\
                                            <p class="validity-period">' + tools.dateFormat(data.startActiveTime) + ' - ' + tools.dateFormat(data.endActiveTime) + '</p>\
                                            <p class="to-use-text">去查看</p>\
                                        </div>\
                                    </div>\
                                    <p class="more-info">\
                                        <span class="showPhone">优惠券已放入账号：' + res.message + '</span>\
                                    </p>' + (isH5 ? '<p class="more-info">更多权益，请下载并登录麦邻生活APP领取使用</p>' : '') +
                        '</div>';
                    if (data.status == 3) {
                        tools.showMsg('优惠券已使用');
                    }
                    if (data.status == 4) {
                        tools.showMsg('优惠券已过期');
                    }
                }
                $('.getCoupon-group').addClass('hide');
                $('.showCoupon-container').removeClass('hide').html(html);
                // h5页面显示精选房源
                if (isH5) {
                    api.getRoomList(activity.renderRoomList);
                }
            }
        },
        renderRoomList: function (roomInfo) {
            var html1 = getRoomHTML(roomInfo.infoName1, roomInfo.infos1);
            var html2 = getRoomHTML(roomInfo.infoName2, roomInfo.infos2);
            $('.recommend-room').html(html1 + html2).parent().removeClass('hide');
            function getRoomHTML(title, list) {
                var str = '<div class="room-list-container"><div class="room-title"><div class="text">' + title + '</div></div>';
                str += '<div class="room-list">';
                $.each(list, function (i, v) {
                    str += '<a href="https://www.mdguanjia.com/waptest/roomDetail/index.html?type=' + v.type + '&roomId=' + v.id + '&memorhomeHost=' + memorhomeHost + '" class="roomList-item">\
                                <div class="room-pic">\
                                    <img alt="" src="' + v.imgUrl + '">\
                                </div>\
                                <div class="room-info">\
                                    <div class="room-name">' + v.areaName + '</div>\
                                    <div class="room-intro">' + v.address + '<br>' + v.title + '</div>\
                                    <div class="room-desc">\
                                        <div class="room-price">' + v.price + '</div>\
                                        <div class="room-addr">' + v.regionName + '</div>\
                                    </div>\
                                </div>\
                            </a>'
                })
                str += '</div></div>';
                return str;
            }
        },
        getSearch: function () {
            var _this = this;
            var userAgent = navigator.userAgent.toLowerCase();
            if (userAgent.indexOf('fht-ios') != -1) {
                clientType = 'ios';
                setupWebViewJavascriptBridge(function (bridge) {
                    bridge.callHandler('getParamsFromNative', {}, function responseCallback(responseData) {
                        pageInfo = responseData;
                        sessionId = pageInfo.sessionId || '';
                        isH5 = false;
                        initPage();
                    })
                })
            } else if (userAgent.indexOf('fht-android') != -1) {
                clientType = 'android';
                pageInfo = JSON.parse(SetupJsCommunication.getParamsFromNative());
                sessionId = pageInfo.sessionId || '';
                isH5 = false;
                initPage();
                // 初始化页面标题和分享信息
                SetupJsCommunication.initPageInfo(JSON.stringify({
                    title: '毕业租房季',
                    shareData: {
                        title: 'High爆了，麦邻毕业季，送50元租房抵扣券+送100元搬家券！',
                        introduction: '麦邻生活毕业季，协助大学生租房优惠福利火热来袭，轻松开启大学毕业之旅！',
                        thumbnail: 'https://www.mdguanjia.com/activities/youth-plan/images/thumbnail.jpg',
                        linkUrl: 'http://192.168.5.116:3000'
                    }
                }))
            }
            if (clientType == 'h5') {
                try {
                    sessionId = localStorage.getItem('MLMHSHJSID') || '';
                }
                catch (err) {
                    console.log(err.message);
                }
                initPage();
            }

            function initPage () {
                _this.bindEvent();
                if (isH5) {
                    $('.getCoupon-group').removeClass('hide');
                }
                if (sessionId) {
                    $('.getCoupon-group').addClass('hide');
                    api.getCouponCode(_this.renderCoupon);
                    return;
                }
                if (!isH5) {
                    $('.getCoupon-group').removeClass('hide');
                    $('.userForm-group').addClass('hide');
                }
            }
        }
    }
    activity.init();
    function setupWebViewJavascriptBridge(callback) {
        if (window.WebViewJavascriptBridge) { return callback(WebViewJavascriptBridge); }
        if (window.WVJBCallbacks) { return window.WVJBCallbacks.push(callback); }
        window.WVJBCallbacks = [callback];
        var WVJBIframe = document.createElement('iframe');
        WVJBIframe.style.display = 'none';
        WVJBIframe.src = 'https://__bridge_loaded__';
        document.documentElement.appendChild(WVJBIframe);
        setTimeout(function () { document.documentElement.removeChild(WVJBIframe) }, 0)
    }
    setupWebViewJavascriptBridge(function (bridge) {
        bridge.registerHandler('initPageInfo', function (data, responseCallback) {
            var pageInfo = {
                title: '毕业租房季',
                shareData: {
                    title: 'High爆了，麦邻毕业季，送50元租房抵扣券+送100元搬家券！',
                    introduction: '麦邻生活毕业季，协助大学生租房优惠福利火热来袭，轻松开启大学毕业之旅！',
                    thumbnail: 'https://www.mdguanjia.com/activities/youth-plan/images/thumbnail.jpg',
                    linkUrl: 'http://192.168.5.116:3000'
                }
            }
            responseCallback(pageInfo)
        })
    })
    setupWebViewJavascriptBridge(function (bridge) {
        bridge.registerHandler('refreshPage', function (data, responseCallback) {
            window.location.reload();
        })
    })
})