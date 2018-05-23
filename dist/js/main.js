$(document).ready(function () {
    var memorhomeHost = 'api';
    var sessionId = '';
    var clientType = 'h5';
    var version = null;
    var cdTime = null;
    var timer = null;
    var localStorage = window.localStorage || ({
        getItem: function () {
            return ''
        },
        setItem: function () {
            return ''
        }
    });

    var isH5 = true;
    var feeTypeArr = ['', '房租', '水费', '电费'];
    if (location.search) {
        var searchObj = {};
        var searchArr = location.search.slice(1).split('&');
        for (var i = 0; i < searchArr.length; i++) {
            if (searchArr[i].split("=")[1]) {
                searchObj[searchArr[i].split("=")[0]] = unescape(searchArr[i].split("=")[1]);
            }
        }
        if (searchObj.clientType) {
            var region = searchObj.clientType.toLowerCase();
            if (region == 1) {
                clientType = 'ios';
            } else if (region == 2) {
                clientType = 'android';
            }
        }
        version = searchObj.version || '';
        var fmtVersion = Number(version.replace(/\./g, ''));
        isH5 = (clientType == 'h5' || fmtVersion < 340) ? true : false;
        if (fmtVersion >= 340) {
            sessionId = searchObj.sessionId || '';
        }
    }

    if (clientType == 'h5') {
        sessionId = localStorage.getItem('MLMHSHJSID') || '';
    }

    initPage();
    /*未登录登录在领取优惠券，已登录直接领取*/
    $('.coupon-container').on('click', '.getCoupon-btn', function () {
        if (isH5) {
            login();
            return;
        }
        if (sessionId) {
            getCouponCode();
            return;
        }
        if (clientType == 'android') {
            try {
                MLActivityLogin.callAppLogin();
            }
            catch (err) {
                console.log(err.message);
            }
        } else {
            setupWebViewJavascriptBridge(function (bridge) {
                bridge.callHandler('loginAction', {}, function responseCallback(responseData) {
                    window.location.href = "./index.html?sessionId=" + escape(responseData.sessionId) + '&clientType=' + responseData.clientType + '&version=3.4.0';
                })
            })
        }
    })
    /*app内跳到优惠券列表页，app外跳转到下载页*/
    $('.coupon-container').on('click', '.to-use', function () {
        if (isH5) {
            if (clientType == 'h5') {
                window.location.href = 'https://www.mdguanjia.com/appdownload/index.html';
            } else {
                layer.alert('请下载最新版【麦邻生活】APP查看优惠券');
            }
            return;
        }
        if (clientType == 'ios') {
            setupWebViewJavascriptBridge(function (bridge) {
                bridge.callHandler('callAppCheckCoupon', {}, function responseCallback(responseData) {
                    // alert('调用成功');
                })
            })
        } else {
            MLActivityCoupon.callAppCheckCoupon();
        }
    })
    /*获取验证码*/
    $('.coupon-container').on('click', '.code-btn', function () {
        getCheckCode();
    })
    /*修改登录账号*/
    $('.coupon-container').on('click', '.modify-btn', function () {
        $('.getCoupon-group').show();
        $('.showCoupon-container').hide();
        localStorage.setItem('MLMHSHJSID', '');
        $('.phone-input input').val('');
        $('.code-input input').val('');
        cdTime = null;
        clearInterval(timer);
        $('.code-btn').html('重发验证码').removeClass('btn-default').addClass('btn-primary');
    })
    /* 输入内容防止软键盘遮盖 */
    $('.userForm-group').delegate('input', 'focus', function () {
        if (/Android/.test(navigator.appVersion)) {
            window.addEventListener("resize", function () {
                if (document.activeElement.tagName.toLowerCase() == "input") {
                    window.setTimeout(function () {
                        document.activeElement.scrollIntoViewIfNeeded();
                    }, 0);
                }
            })
        } else {
            var self = $(this);
            window.setTimeout(function () {
                if (self.scrollIntoView) {
                    self.scrollIntoView();
                }
            }, 100);
        }
    });

    function initPage() {
        if (isH5) {
            $('.getCoupon-group').show();
        } else {
            $('.modify-btn').hide();
        }
        if (sessionId) {
            getCouponCode();
            return;
        }
        if (!isH5) {
            $('.getCoupon-group').show();
            $('.userForm-group').hide();
        }
    }

    function getCouponCode() {
        sendReq('/myhome/api/joinActivity', {
            "v": "",
            "method": "",
            "params": {
                activityCode: 'MJGY20180320',
                source: clientType,
                sessionId: sessionId
            }
            // sessionId: this.sessionId
            // sessionId: '1UPsWqX+eN47WrYVUzS5H2SjxKodWrVe6Xb3D39HNv9dNkKlbxTNigXT3Y9tUElWi8vFhchJURU3Lowbqd/JJZzs1Uh+lF6tBcj8CY5rk46lEpHSAD7i3lBy+DjUH3GiJTTizaONr1+ysADpJsMR+Q=='
        }, function (res) {
            renderCoupon(res);
        })
    }

    function getCheckCode() {
        if (!testPhone() || cdTime > 0) {
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

        sendReq('/myhome/api/customer', {
            "v": "2.3",
            "method": "sendCheckcode",
            "params": {
                "devId": "h5",
                "jpushId": "",
                "mobile": $('.phone-input input').val(),
            }
        }, function (res) {
            if (res.code == 0) {
                layer.msg('验证码发送成功，请查收');
            } else {
                layer.msg(res.message || '网络连接失败，请重试');
            }
        })
    }

    function login() {
        if (!testPhone() || !testCode()) {
            return;
        }
        sendReq('/myhome/api/customer', {
            "v": "1.0",
            "method": "loginByVcode",
            "params": {
                "devId": "h5",
                "jpushId": "",
                "mobile": $('.phone-input input').val(),
                "vcode": $('.code-input input').val()
            }
        }, function (res) {
            if (res.data && res.data.sessionId) {
                sessionId = res.data.sessionId;
                if (clientType == 'h5') {
                    localStorage.setItem('MLMHSHJSID', sessionId);
                }
                getCouponCode();
            } else {
                layer.msg(res.message || '网络连接失败，请重试');
            }
        })
    }

    function testPhone() {
        if ($('.phone-input input').val() == '') {
            layer.msg('请输入手机号');
            return false;
        }
        if (/^1([358][0-9]|4[579]|66|7[0135678]|9[89])[0-9]{8}$/.test($('.phone-input input').val()) == false) {
            layer.msg('请输入正确的手机号');
            return false;
        }
        return true;
    }

    function testCode() {
        if (!$('.code-input input').val()) {
            layer.msg('验证码不能为空');
            return false;
        }
        if ($('.code-input input').val().length !== 6) {
            layer.msg('请输入正确的验证码');
            return false;
        }
        return true;
    }

    function renderCoupon(res) {
        if (res.code == 8888) {
            $('.getCoupon-group').hide();
            $('.showCoupon-container').show();
            $('.showCoupon-container .noCoupon').show().siblings().hide();
            return;
        }
        if (res.code == 6666) {
            $('.getCoupon-group').hide();
            $('.showCoupon-container').show();
            $('.showCoupon-container .outDate').show().siblings().hide();
            return;
        }
        if (res.code == 0 && res.data && res.message) {
            var data = res.data;
            var msg = res.message;
            $('.getCoupon-group').hide();
            $('.showCoupon-container').show();

            if (data.status == 3) {
                layer.msg('红包已使用');
            }
            if (data.status == 4) {
                layer.msg('红包已过期');
            }
            data.feeType = feeTypeArr[data.feeType];
            data.startActiveTime = dateFormat(data.startActiveTime);
            data.endActiveTime = dateFormat(data.endActiveTime);
            $('.couponCode .count').html('¥' + data.discountAmount);
            $('.couponCode .name').html(data.couponName);
            $('.couponCode .range').html('使用范围：' + data.feeType);
            $('.couponCode .validity-period').html('有效期限：' + data.startActiveTime + ' - ' + data.endActiveTime);
            $('.showPhone').html('红包已放入账号: ' + msg);
        } else {
            layer.msg(res.message || '网络连接失败，请重试');
        }
    }

    function dateFormat(t) {
        var d = new Date(t);
        var year = d.getFullYear();
        var month = d.getMonth() + 1;
        var date = d.getDate();
        month = month < 10 ? '0' + month : month;
        date = date < 10 ? '0' + date : date;
        return year + '/' + month + '/' + date;
    }

    function sendReq(url, params, callback) {
        if (!url || !params) {
            alert('参数不全！');
            return;
        }
        var baseParams = {
            "reqId": "h5",
            "timestamp": JSON.stringify(new Date())
        };
        params = $.extend({}, baseParams, params);
        $.ajax({
            type: 'post',
            url: 'https://' + memorhomeHost + '.mdguanjia.com' + url,
            contentType: "application/json; charset=utf-8",
            dataType: 'json',
            data: JSON.stringify(params),
            success: function (data) {
                if (callback) {
                    callback(data);
                }
            },
            error: function (data) {
                layer.msg('网络连接失败，请重试');
                return false;
            }
        });
    }

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

    /*麦滴过来的链接要调分享功能*/
    setupWebViewJavascriptBridge(function (bridge) {
        bridge.registerHandler('ShareFromAppHandler', function (data, responseCallback) {
            var shareObj = {
                title: '助力美好租房生活，百万红包免费送！',
                introduction: '麦邻生活为北上广深、沪杭、成渝汉9城小伙伴送出价值百万租房红包，最高可获千元租房红包！',
                thumbnail: 'https://www.mdguanjia.com/activities/mlmhshj/dist/images/wx-share.png',
                linkUrl: 'https://www.mdguanjia.com/activities/mlmhshj/index.html'
            }
            responseCallback(shareObj)
        })
    })


})