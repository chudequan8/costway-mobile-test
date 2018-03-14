$(document).ready(function() {
	var memorhomeHost = 'test';
	var sessionId = localStorage.getItem('MLMHSHJSID') || '';
	var clientType = 'h5';
	var cdTime = null;
	var feeTypeArr = ['', '房租', '水费', '电费'];

	if(location.search){
	  var searchObj = {};
	  var searchArr = location.search.slice(1).split('&');
	  for (var i = 0; i < searchArr.length; i++) {
	    if(searchArr[i].split("=")[1]){
	      searchObj[searchArr[i].split("=")[0]] = unescape(searchArr[i].split("=")[1]);
	    }
	  }
	  if(searchObj.sid){
	  	sessionId = searchObj.sid;
	  }
	  if(searchObj.clientType){
	  	var region = searchObj.clientType.toLowerCase();
	  	if(region == 'ios'){
	  		clientType = 'ios';
	  	} else if(region == 'android'){
	  		clientType = 'android';
	  	}
	  }
	}

	initPage();

	setupWebViewJavascriptBridge(function(bridge) {
    $(document).on('click', '.getCoupon-btn', function() {
    	if(clientType == 'ios'){
    		if(sessionId){
    			getCouponCode();
    		} else {
  		    bridge.callHandler('loginAction', {}, function responseCallback(responseData) {
  		    	alert(responseData);
  		    	sessionId = responseData.sessionId;
  		    })
    		}
    	} else if (clientType == 'android'){
    		if(sessionId){
    			getCouponCode();
    		} else {
    			MLActivityLogin.callAppLogin();
    		}
    	} else {
    		if(sessionId){
    			getCouponCode();
    		} else {
    			login();
    		}
    	}
    	// getCouponCode();
    })
    $(document).on('click', '.toUse', function() {
    	if(clientType == 'ios'){
  	    bridge.callHandler('callAppCheckCoupon', {}, function responseCallback(responseData) {
  				alert('调用成功');
  	    })
    	} else if (clientType == 'android'){
    		MLActivityCoupon.callAppCheckCoupon();
    	} else {
    		var searchUrl = location.search;  
    		var config = {
    		    scheme_IOS:'MyRoom://activity',
    		    scheme_And:'myroom://'
    		};
    		// 非微信端唤醒APP
    		if(navigator.userAgent.toLowerCase().indexOf('micromessenger') > -1){
        	location.href = 'http://a.app.qq.com/o/simple.jsp?pkgname=com.memorhome.home';
    		}else if (/(iPhone|iPad|iPod|iOS)/i.test(navigator.userAgent)) {
    	    window.location.href = config.scheme_IOS + searchUrl;
    		} else if (/(Android)/i.test(navigator.userAgent)) {
    	    window.location.href = config.scheme_And + searchUrl;
    		}
    	}
    })
	})

	$(document).on('click', '.code-btn', function() {
		getCheckCode();
	})

	/* 输入内容防止软键盘遮盖 */
	$('.userForm-group').delegate('input','focus',function(){
		if(/Android/.test(navigator.appVersion)) {
		    window.addEventListener("resize", function() {		    	
		        if(document.activeElement.tagName.toLowerCase() == "input") {
		            window.setTimeout(function() {
		                document.activeElement.scrollIntoViewIfNeeded();
		            },0);
		        }
		    })
		}else{
			var self = $(this);
			window.setTimeout(function() {
				if(self.scrollIntoView){
          self.scrollIntoView();
				}
      },100);
		}
	});

	function initPage() {
		if(clientType == 'ios' || clientType == 'android'){
			$('.userForm-group').css('visibility', 'hidden');
		} else {
			if(sessionId){
				$('.userForm-group').css('visibility', 'hidden');
			} else {

			}
		}
	}
	function getCouponCode() {
		sendReq('/myhome/api/joinActivity', {
			"v": "",
			"method": "",
			"params": {
				activityCode: 'ASB',
				source: 'cdq',
				sessionId: 'E71J49D1Yl7bw0fVtkxgC7duHjxHvvxTRm6ewt3jUgqnohd9QB+mK0VeSG9dCrBK4QPod7m0LFEA0fM7v8lwnhUsEcEtwzNz2cvjbNeViB0nGrHHZ/CfPGCoDjNDCf64ALBSLwmdxsjuZj9BVePv02GsseNEtEm290FS0DOeVA8\u003d'
			}
			// sessionId: this.sessionId
			// sessionId: '1UPsWqX+eN47WrYVUzS5H2SjxKodWrVe6Xb3D39HNv9dNkKlbxTNigXT3Y9tUElWi8vFhchJURU3Lowbqd/JJZzs1Uh+lF6tBcj8CY5rk46lEpHSAD7i3lBy+DjUH3GiJTTizaONr1+ysADpJsMR+Q=='
		}, function(res) {
			if(res.code == 0){
				if(res.data){
					renderCoupon(res.data);
				}
			} else {
				renderCoupon(null);
			}
		})
	}
	function getCheckCode() {
		if(!testPhone() || cdTime > 0){
			return ;
		}

		cdTime = 59;
		$('.code-btn').html(cdTime + '秒后重发').removeClass('btn-primary').addClass('btn-default');
		var timer = setInterval(() => {
			cdTime--;
			$('.code-btn').html(cdTime + '秒后重发');
		  if(cdTime < 0){
		    clearInterval(timer);
		    $('.code-btn').html('重发验证码').removeClass('btn-default').addClass('btn-primary');
		  }
		}, 1000);

		sendReq('/myhome/api/customer', {
			"v": "2.3",
			"method": "sendCheckcode",
			"params": {
				"devId": "5555998cccf2492db015c442f087f00a",
				"jpushId": "",
				"mobile" : $('.phone-input input').val(),
			}
		}, function(res) {
			if(res.code == 0){
				layer.msg('验证码发送成功，请查收');
			} else {
				layer.msg(res.message || '网络连接失败，请重试');
			}
		})
	}
	function login() {
		if(!testPhone() || !testCode()){
			return ;
		}
		sendReq('/myhome/api/customer', {
			"v": "1.0",
			"method": "loginByVcode",
			"params": {
				"devId": "5555998cccf2492db015c442f087f00a",
				"jpushId": "",
				"mobile" : $('.phone-input input').val(),
				"vcode": $('.code-input input').val()
			}
		}, function(res) {
			if(res.data && res.data.sessionId){
				sessionId = res.data.sessionId;
				localStorage.setItem('MLMHSHJSID', sessionId);
				getCouponCode();
			}
		})
	}
	function testPhone() {
		if($('.phone-input input').val() == ''){
			layer.msg('请输入手机号');
		  return false;
		}
		if(/^1([358][0-9]|4[579]|66|7[0135678]|9[89])[0-9]{8}$/.test($('.phone-input input').val()) == false){
			layer.msg('请输入正确的手机号');
		  return false;
		}
		return true;
	}
	function testCode() {
		if(!$('.code-input input').val()){
			layer.msg('验证码不能为空');
		  return false;
		}
		if($('.code-input input').val().length !== 6){
			layer.msg('请输入正确的验证码');
		  return false;
		}
		return true;
	}
	function renderCoupon(data) {

		if(data == null){
			$('.getCoupon-group').hide();
			$('.showCoupon-container').show();
			$('.showCoupon-container .noCoupon').show().siblings().hide();
			return ;
		}
		// if(data.status == 3){
		// 	layer.msg('您已领取过优惠券并已使用');
		// 	return ;
		// }
		$('.getCoupon-group').hide();
		$('.showCoupon-container').show();

		if(data.status == 1 || data.status == 2){
			// layer.msg('优惠券领取成功');
			data.feeType = feeTypeArr[data.feeType];
			data.startActiveTime = dateFormat(data.startActiveTime);
			data.endActiveTime = dateFormat(data.endActiveTime);
			$('.couponCode .count').html('¥' + data.discountAmount);
			$('.couponCode .name').html(data.couponName);
			$('.couponCode .range').html('使用范围：' + data.feeType);
			$('.couponCode .validity-period').html('有效期限：' + data.startActiveTime + ' - ' + data.endActiveTime);
			$('.showPhone').html('红包已放入账号: ' + $('.phone-input input').val());
		}
		if(data.status == 4){
			$('.showCoupon-container .outDate').show().siblings().hide();
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
	function sendReq(url, params, callback){
		if(!url || !params){
		  alert('参数不全！');
		  return ;
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
			success: function(data){
				if(data.code == 0){
					if(callback){
						callback(data);
					}
				} else {
					layer.msg(data.message || '网络连接失败，请重试');
					return false;
				}
			},
			error:function(data){
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
	    setTimeout(function() { document.documentElement.removeChild(WVJBIframe) }, 0)
	}
})

function getSessionId(string) {
	sessionId = string;
}