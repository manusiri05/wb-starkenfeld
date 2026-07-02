/* JS for preset "Menu V2" */
(function() {
	$(function() {
		$('.menu-wrapper').each(function() {
			initMenu($(this))
		});
	});

	// Make :active pseudo classes work on iOS
	document.addEventListener("touchstart", function() {}, false);

	var initMenu = function($menuWrapper) {
		var $body = $('body');
		var $menu = $('.ed-menu', $menuWrapper);
		var $menuLinks = $('a', $menu);
		var $menuTrigger = $('.menu-trigger', $menuWrapper);
		var $banner = $('.banner').first();

		var menuWrapperHeight = $menuWrapper.outerHeight();
		var bannerHeight = $banner.length ? $banner.outerHeight() : 0;
		var smoothScrollOffset = 20;
		
		toggleClassOnClick($body.add($menu), $menuTrigger, null, 'open open-menu'); // Keep open on $menu for backward compatibility
		activateSmoothScroll($menuLinks.add($('.scroll a')), smoothScrollOffset);
		addClassOnVisibleLinkTargets($menuLinks, 'active', 2 / 3);
		handleSticky($menuWrapper, 'sticky', $banner);
	};

	/**
	 * Observe element's height changes and reload the initMenu() function
	 *
	 * @param {HTMLElement} elm Element to observe
	 * @param {function} callback to call when elmement's height changed
	 */
	var observeHeightChange = function(elm, callback) {
		if (!('ResizeObserver' in window) || elm == null) return;

		var ro = new ResizeObserver(callback);
		ro.observe(elm);
	}

	/**
	 * Toggles class on a target when a trigger is clicked
	 * 
	 * @param {jQuery} $target The target to apply the CSS class to
	 * @param {jQuery} $trigger The Trigger
	 * @param {jQuery} $closeTrigger Optional close trigger
	 * @param {string} cssClass CSS Class to toggle on the target
	 */
	var toggleClassOnClick = function($target, $trigger, $closeTrigger, cssClass) {

		// Reset in case class "open" was saved accidentally
		$target.removeClass(cssClass);
		$trigger.removeClass(cssClass);

		// Click on trigger toggles class "open"
		$trigger.off('.toggle').on('click.toggle', function() {
			$(this).toggleClass(cssClass);
			$target.toggleClass(cssClass);
		});

		// Close target when link inside is clicked
		$target.find('a').click(function() {
			$target.removeClass(cssClass);
			$trigger.removeClass(cssClass);
		});

		if (!$closeTrigger || !$closeTrigger.length) {
			return;
		}

		$closeTrigger.click(function() {
			$target.removeClass(cssClass);
			$trigger.removeClass(cssClass);
		});
	};

	/**
	 * Smooth scroll to link targets
	 * 
	 * @param {jQuery} $scrollLinks The links
	 * @param {jQuery} scrollOffset Offset to subtract from the scroll target position (e.g. for fixed positioned elements like a menu)
	 */
	var activateSmoothScroll = function($scrollLinks, scrollOffset) {
		if (typeof scrollOffset === 'undefined') {
			scrollOffset = 0;
		}

		var determineTarget = function($trigger, hash) {
			if (hash == '#!next') {
				return $trigger.closest('.ed-element').next();
			}

			return $(hash);
		}

		$scrollLinks.click(function(e) {
			var $target = determineTarget($(this), this.hash);
			if (!$target.length) return;
			e.preventDefault();

			viewport.scrollTo($target, 'top', 500, 0);

		});
	};

	/**
	 * We are using the fill property on an element to pass user's choices from CSS to JavaScript
	 * 
	 * @param {jQuery} $element
	 */
	var getStickyMode = function($element) {
		var fillValue = getComputedStyle($element[0]).fill;

		return fillValue === 'rgb(255, 0, 0)' ?
			'sticky_banner' :
			fillValue === 'rgb(0, 255, 0)' ?
			'sticky_menu' :
			fillValue === 'rgb(0, 0, 255)' ?
			'sticky_instant' :
			fillValue === 'rgb(255, 255, 255)' ?
			'sticky_reverse' :
			'sticky_none';
	};

	/**
	 * Adds a class to an element when not currently visible
	 * 
	 * @param {jQuery} $element The element to handle stickyness for
	 * @param {string} cssClass The actual CSS class to be applied to the element when it's above a certain scroll position
	 * @param {jQuery} $banner A banner to reference the scroll position to
	 */
	var handleSticky = function($element, cssClass, $banner) {
		var triggerPos = 0,
			offset = 0;
		var menuWrapperHeight = $element.outerHeight();
		var mode;
		var prevScroll = 0;
		$element.removeClass(cssClass);
		
		var toggleSpacer = function(toggle) {
			document.body.style.setProperty('--spacer-height', toggle ? menuWrapperHeight + 'px' : '');
		};

		var handleScroll = function() {
			if (!$element.length || mode === 'sticky_none') return;

			var isReverse = mode === 'sticky_reverse',
				curScroll = viewport.getScrollTop();

			if (triggerPos <= curScroll && (!isReverse || prevScroll > curScroll)) {
				$element.addClass(cssClass);
				toggleSpacer(true);
			} else {
				$element.removeClass(cssClass);
				toggleSpacer(false);
			}

			prevScroll = curScroll;
		};
		
		var updateOffset = function() {
			mode = getStickyMode($element);
			menuWrapperHeight = $element.outerHeight();
			if (!$element.hasClass(cssClass)) {
				offset = $element.offset().top;
			}
			if (mode === 'sticky_banner' && !$banner.length) {
				mode = 'sticky_menu';
			}
			if (mode === 'sticky_banner') {
				triggerPos = $banner.offset().top + ($banner.length ? $banner.outerHeight() : $element.outerHeight());
			}
			if (mode === 'sticky_menu' || mode === 'sticky_reverse') {
				triggerPos = offset + $element.outerHeight();
			}
			if (mode === 'sticky_instant') {
				triggerPos = offset;
			}
			
			handleScroll();
		}
		
		viewport.observe('resize', updateOffset);
		viewport.observe('animation.end', updateOffset);
		observeHeightChange($element[0], updateOffset);
		updateOffset();
		
		viewport.observe('scroll', handleScroll);
		handleScroll();
	};

	/**
	 * Adds a class to links whose target is currently inside the viewport
	 * 
	 * @param {jQuery} $links Link(s) to be observed
	 * @param {string} cssClass CSS Class to be applied
	 * @param {float} sectionViewportRatio Ratio by which the target should be within the viewport
	 */
	var addClassOnVisibleLinkTargets = function($links, cssClass, sectionViewportRatio) {
		if (typeof sectionViewportRatio === 'undefined') {
			sectionViewportRatio = 1 / 2;
		}

		var menuTargets = [];
		var activeLink = $links.filter('.active:not(.wv-link-elm)').eq(0);

		var links = $links.filter(function() {
			var $target = $(this.hash);
			if (!$target.length) {
				return false;
			}

			// Cache offset position to improve performance (update on resize)		
			var updateOffset = function() {
				$target.data('offset', $target.offset().top);
			};

			viewport.observe('resize', updateOffset);
			viewport.observe('animation.end', updateOffset);
			updateOffset();

			menuTargets.push($target);
			return true;
		});

		// No hash links found, so don't handle it at all
		if (!links.length) {
			return;
		}

		var checkVisibility = function() {
			$links.removeClass('active');

			// Check section position reversely
			for (var i = menuTargets.length - 1; i >= 0; i--) {
				var desiredScrollPosition = menuTargets[i].data('offset') - viewport.getHeight() * (1 - sectionViewportRatio);
				if (viewport.getScrollTop() >= desiredScrollPosition && menuTargets[i][0].offsetParent !== null) {
					links.eq(i).addClass(cssClass);
					return;
				}
			}

			// Fallback to originally active item
			activeLink.addClass(cssClass);
		};

		viewport.observe('scroll', checkVisibility);
		checkVisibility();
	};
})();
/* End JS for preset "Menu V2" */

/* JS for preset "Horizontal form V3" */
(function() {
	$(function() {
		if (!$('body').is('.edit')) {
			$('.horizontal-form').each(function() {
				$(this).click(function() {
					$('.ed-form-captcha', this).addClass('show');
					$('.ed-form-checkbox.privacy', this).addClass('show');
				});
			});
		}
	});
})();

/* End JS for preset "Horizontal form V3" */

/* JS for preset "FIlter Gallery V3" */
$(function() {

	var preview = false;
	var listener = function() {
		if (!preview && document.body.classList.contains('preview')) {
			preview = true;
		} else if (preview && !document.body.classList.contains('preview')) {
			$('.filter-instance .filter-gallery-container').fadeOut(300, function() {
				$('.filter-instance .filter-gallery-container .ed-image').show();
				$('.filter-instance .filter-gallery-container').fadeIn(300);
				$('.filter-instance .filter-gallery-trigger-container .filter-gallery-button').removeClass('active');
			});
			preview = false;
		}

		requestAnimationFrame(listener);
	};

	requestAnimationFrame(listener);

	var parseFilters = function(elm) {
		var regex = /filter-([a-z0-9]+)/gi,
			filters = [],
			matches;

		while (matches = regex.exec(elm.className)) {
			filters.push(matches[1]);
		}

		return filters;
	};
    
	var parseLinkFilters = function(elm, separator) {
		separator = separator || ';';
		if ("" === elm.hash) return [];
		return elm.hash.slice(1).split(separator);
	};

	$('.filter-instance').each(function() {

		var $instance = this,
			imageSelector = '.filter-gallery-container .ed-image',
			$images = $(imageSelector, $instance),
			$imageContainer = $('.filter-gallery-container', $instance),
			$trigger = $('.filter-gallery-button', $instance);

		$images.each(function() {
			var filters = parseFilters(this);
			$(this).attr('data-before', filters.join(' '));
		});
		
		$('.showall').addClass('active');
		        
		if (document.body.classList.contains('edit')) {
            $('.showall').removeClass('active');
		}   
		    
    
		$trigger.click(function() {
			$trigger.removeClass('active');
			$(this).addClass('active');

			var filters = parseLinkFilters(this),
				$filtered = $images.filter(function() {
					return this.className.match(new RegExp('filter-(' + filters.join('|') + ')'));
				});

			if (filters.length === 1 && 'showall' === filters[0]) {
				$imageContainer.fadeOut(300, function() {
					$images.show();
					$imageContainer.fadeIn(300);
				});

				return;
			}

			$imageContainer.fadeOut(300, function() {
				$images.hide();
				$filtered.show();
				$imageContainer.fadeIn(300);
			});
		});
	});
});
/* End JS for preset "FIlter Gallery V3" */

/* JS for preset "Call to Action - Countdown" */
$(function() {
	var isIE11 = !!window.MSInputMethodContext && !!document.documentMode,
		isSafari =
		navigator.userAgent.toLowerCase().indexOf('safari') > -1 &&
		navigator.userAgent.toLowerCase().indexOf('chrome') === -1;

	var slice = Array.prototype.slice;

	var valid = true;

	var ready = function(callback) {
		var fn = function() {
			if (document.body.classList.contains('edit')) {
				return;
			}
			callback();
		};

		if (window.readyState !== 'loading') {
			fn();
			return;
		}

		document.addEventListener('DOMContentLoaded', fn);
	}

	var countdown = function(date, tick) {
		var now = new Date().getTime(),
			running = false,
			days = 0,
			hours = 0,
			minutes = 0,
			seconds,
			interval;

		var updateCounter = function() {
			if (!running) return;

			now = new Date().getTime();
			seconds = Math.round((date - now) / 1000);

			if (seconds > 86400) {
				days = Math.floor(seconds / 86400);
				seconds %= 86400;
			}

			if (seconds > 3600) {
				hours = Math.floor(seconds / 3600);
				seconds %= 3600;
			}

			if (seconds > 60) {
				minutes = Math.floor(seconds / 60);
				seconds %= 60;
			}

			tick(days, hours, minutes, seconds);
		};

		date = new Date(date).getTime();
		if (now >= date) {
			valid = false;
			console.log('Date cannot be in the past.');
			return;
		}

		if (now >= date) {
			valid = false;
			console.log('Date cannot be in the past.');
		}

		tick = tick || (function() {});

		return {
			start: function() {
				interval = window.setInterval(updateCounter, 1000);
				running = true;
				updateCounter();
			},
			stop: function() {
				if (interval) window.clearInterval(interval);
				interval = undefined;
				running = false;
			}
		}
	};

	var writeCountdown = function(element, days, hours, minutes, seconds) {
		var hoursElm = element.querySelector('.countdown-hours'),
			minutesElm = element.querySelector('.countdown-minutes'),
			secondsElm = element.querySelector('.countdown-seconds');
 
		if (hoursElm) hoursElm.innerHTML = hours;
		if (minutesElm) minutesElm.innerHTML = minutes;
		if (secondsElm) secondsElm.innerHTML = seconds;
	}

	var buildCountdown = function(e) {
		var instances = slice.call(document.querySelectorAll('.call-to-action-countdown-time')),
			len = instances.length,
			i = 0,
			element,
			countdownHours;

		for (; i < len; i++) {
			element = instances[i];

			countdownHours = window.getComputedStyle(instances[i], ':before').content.slice(1, -1);			
            var now = new Date().getTime();
			var date =  new Date(now + countdownHours*60*60000);

			element.countdown = countdown(date, function(days, hours, minutes, seconds) {
				writeCountdown(
					element, parseInt(days),
					("0" + parseInt(hours)).slice(-2),
					("0" + parseInt(minutes)).slice(-2),
					("0" + parseInt(seconds)).slice(-2)
				);
			});
			if (valid) {
				element.countdown.start();
			}
		}
	};

	var destroyCountdown = function(e) {
		var instances = slice.call(document.querySelectorAll('.call-to-action-countdown-time')),
			len = instances.length,
			i = 0,
			element;
		for (; i < len; i++) {
			element = instances[i];
			writeCountdown(element, "0", "00", "00", "00");
			element.countdown.stop();
		}
	}

	var preview = false;
	var listener = function() {
		if (valid) {
			if (!preview && document.body.classList.contains('preview')) {
				buildCountdown();
				preview = true;
			} else if (preview && !document.body.classList.contains('preview')) {
				destroyCountdown();
				preview = false;
			}
		}

		requestAnimationFrame(listener);
	};

	requestAnimationFrame(listener);
	ready(function() {
		buildCountdown();
	});
});
/* End JS for preset "Call to Action - Countdown" */

/* JS for preset "Cookie Consent Bar V3" */
$(function() {
	$('#cookieClose').click(function(e) {
		e.preventDefault();
		createCookie('cookieConsentBar', "rejected", 0.5);
		$('.cookie-consent-bar').hide();
		
		// If inside of an overlay, close it too
		if ($('.cookie-consent-bar').closest('.mfp-content').length) {
			$.magnificPopup.close();
			return;
		}
	});

	$('#acceptCookie').click(function(e) {
		e.preventDefault();
		createCookie('cookieConsentBar', "accepted", 0.5);
		$('.cookie-consent-bar').hide();

		if (typeof ThirdPartyScripts !== "undefined") {
			ThirdPartyScripts.unblock();
		}

		// If inside of an overlay, close it too
		if ($('.cookie-consent-bar').closest('.mfp-content').length) {
			$.magnificPopup.close();
			return;
		}
	});

	var preview = false;
	
	var listener = function() {
		if (!preview && document.body.classList.contains('preview')) {
			console.log("entering preview");
			preview = true;
		} else if (preview && !document.body.classList.contains('preview')) {
			console.log("leaving preview");
			$('.cookie-consent-bar').show();
			preview = false;
		}
		requestAnimationFrame(listener);
	};
	
	requestAnimationFrame(listener);

	if (document.body.classList.contains('edit') || document.body.classList.contains('preview')) {
		return;
	}

	
	// Cookie bar
	if (readCookie('cookieConsentBar') == "accepted") {
		$('.cookie-consent-bar').hide();
		window.setTimeout(function() {
			if (typeof ThirdPartyScripts !== "undefined") {
				ThirdPartyScripts.unblock();
			}
		}, 100);
	} else if (readCookie('cookieConsentBar') == "rejected") {
		$('.cookie-consent-bar').hide();
	} else {
		$('.cookie-consent-bar').show();
	}
	
	function readCookie(name) {
		var nameEQ = name + "=";
		var ca = document.cookie.split(';');
		for (var i = 0; i < ca.length; i++) {
			var c = ca[i];
			while (c.charAt(0) == ' ') c = c.substring(1, c.length);
			if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
		}
		return null;
	}   
    
	function createCookie(name, value, days) {
		if (days) {
			var date = new Date();
			date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
			var expires = "; expires=" + date.toGMTString();
		} else expires = "";
		document.cookie = name + "=" + value + expires + "; path=/";
	}
	
    // Fix for hiding Content till page is loaded
	$(document).ready(function() {
		$('.hide-cookie-content').removeClass("hide-cookie-content");
	});
});   
/* End JS for preset "Cookie Consent Bar V3" */

/* JS for preset "Cookie Bar V2" */
$(function() {
    if (!$('body').is('.edit')) {
    	$('.cookie-close').click(function(e) {
    		e.preventDefault();
    		$('.cookie-bar').hide();
    		createCookie('cookieBar', true, 0.5);
    	});
    }

	var preview = false;
	
	var listener = function() {
		if (!preview && document.body.classList.contains('preview')) {
			console.log("entering preview");
			preview = true;
		} else if (preview && !document.body.classList.contains('preview')) {
			console.log("leaving preview");
			$('.cookie-bar').show();
			preview = false;
		}
		requestAnimationFrame(listener);
	};
	
	requestAnimationFrame(listener);

	if (document.body.classList.contains('edit') || document.body.classList.contains('preview')) {
		return;
	}

	// Cookie bar
	if (readCookie('cookieBar') !== null) {
		$('.cookie-bar').hide();
	} else {
		$('.cookie-bar').show();
	}

	function readCookie(name) {
		var nameEQ = name + "=";
		var ca = document.cookie.split(';');
		for (var i = 0; i < ca.length; i++) {
			var c = ca[i];
			while (c.charAt(0) == ' ') c = c.substring(1, c.length);
			if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
		}
		return null;
	}

	function createCookie(name, value, days) {
		if (days) {
			var date = new Date();
			date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
			var expires = "; expires=" + date.toGMTString();
		} else var expires = "";
		document.cookie = name + "=" + value + expires + "; path=/";
	}
});

//dates 

  document.addEventListener("DOMContentLoaded", function () {
    const anreiseHidden = document.querySelector('input[name="form_711892079[ed-f-711892082]"]');
    const abreiseHidden = document.querySelector('input[name="form_711892079[ed-f-711892085]"]');
    const abreiseVisible = document.getElementById('form_711892079_ed-f-711892085');

    if (anreiseHidden && abreiseHidden && abreiseVisible) {
      const observer = new MutationObserver(() => {
        if (anreiseHidden.value && !abreiseHidden.value) {
          abreiseHidden.value = anreiseHidden.value;
          abreiseVisible.value = anreiseHidden.value;
        }
      });

      observer.observe(anreiseHidden, {
        attributes: true,
        attributeFilter: ['value']
      });
    }
  });

/* End JS for preset "Cookie Bar V2" */

/* JS for preset "Language V2" */
$(function() {
	//Adds Flag data attr
	setTimeout(function() {
		$(".language-item").children('a').each(function() {
			//Check for potentially unfitting language codes as they might differentiate from flag codes
			function correctLangCode(source) {
				return source === "en" ? 'gb' : // English -> United Kingdom
					source === "km" ? "kh" : // Khmer -> Cambodia
					source === "ko" ? "kr" : // Korean -> South Korea
					source === "he" ? "il" : // Hebrew -> Israel
					source === "ar" ? "ae" : // Arabic -> United Arab Emirates
					source === "da" ? "dk" : // Danish -> Denmark
					source === "uk" ? "ua" : // Ukrainian -> Ukraine
					source === "el" ? "gr" : // Greek -> Greece
					source === "lb" ? "lu" : // Luxembourgish -> Luxembourg
					source === "sl" ? "si" : // Slovenian -> Slovenia
					source === "sq" ? "al" : // Albanian -> Albania
					source === "sv" ? "se" : // Swedish -> Sweden
					source === "ca" ? "es-ca" : // Catalan -> Spain/Catalonia
					source === "ja" ? "jp" : // Japanese -> Japan
					source === "hi" ? "in" : // Hindi -> India
					source === "be" ? "by" : // Belarusian -> Belarus
					source === "bn" ? "bd" : // Bengali -> Bangladesh
					source === "pa" ? "in" : // Punjabi -> India
					source === "ur" ? "pk" : // Urdu -> Pakistan
					source === "vi" ? "vn" : // Vietnamese -> Vietnam
					source === "zh" ? "cn" : // Chinese -> China
					source === "sr" ? "rs" : // Serbian -> Serbia
					source === "bs" ? "ba" : // Bosnian -> Bosnia and Herzegovina
					source === "cs" ? "cz" : // Czech -> Czech Republic
					source === "fa" ? "ir" : // Persian -> Iran
					source === "ka" ? "ge" : // Georgian -> Georgia
					source === "hy" ? "am" : // Armenian -> Armenia
					source === "kk" ? "kz" : // Kazakh -> Kazakhstan
					source === "ky" ? "kg" : // Kyrgyz -> Kyrgyzstan
					source === "tg" ? "tj" : // Tajik -> Tajikistan
					source === "tk" ? "tm" : // Turkmen -> Turkmenistan
					source === "my" ? "mm" : // Burmese -> Myanmar
					source === "lo" ? "la" : // Lao -> Laos
					source === "si" ? "lk" : // Sinhala -> Sri Lanka
					source === "ta" ? "lk" : // Tamil -> Sri Lanka
					source === "ne" ? "np" : // Nepali -> Nepal
					source === "dz" ? "bt" : // Dzongkha -> Bhutan
					source === "bo" ? "cn" : // Tibetan -> China
					source === "eu" ? "es" : // Basque -> Spain
					source === "gl" ? "es" : // Galician -> Spain
					source === "cy" ? "gb" : // Welsh -> United Kingdom
					source === "ga" ? "ie" : // Irish -> Ireland
					source === "gd" ? "gb" : // Scottish Gaelic -> United Kingdom
					source === "kl" ? "gl" : // Greenlandic -> Greenland
					source === "mi" ? "nz" : // Maori -> New Zealand
					source === "sm" ? "ws" : // Samoan -> Samoa
					source === "ny" ? "mw" : // Chichewa -> Malawi
					source === "sn" ? "zw" : // Shona -> Zimbabwe
					source === "sw" ? "tz" : // Swahili -> Tanzania
					source === "am" ? "et" : // Amharic -> Ethiopia
					source === "ti" ? "er" : // Tigrinya -> Eritrea
					source === "om" ? "et" : // Oromo -> Ethiopia
					source === "rn" ? "bi" : // Kirundi -> Burundi
					source === "lg" ? "ug" : // Luganda -> Uganda
					source === "wo" ? "sn" : // Wolof -> Senegal
					source === "ff" ? "sn" : // Fulah -> Senegal
					source === "ha" ? "ng" : // Hausa -> Nigeria
					source === "ig" ? "ng" : // Igbo -> Nigeria
					source === "yo" ? "ng" : // Yoruba -> Nigeria
					source === "zu" ? "za" : // Zulu -> South Africa
					source === "xh" ? "za" : // Xhosa -> South Africa
					source === "af" ? "za" : // Afrikaans -> South Africa
					source === "st" ? "ls" : // Sesotho -> Lesotho
					source === "tn" ? "bw" : // Tswana -> Botswana
					source === "ss" ? "sz" : // Swati -> Eswatini
					source === "ve" ? "za" : // Venda -> South Africa
					source === "ts" ? "za" : // Tsonga -> South Africa
					source === "nr" ? "za" : // Ndebele -> South Africa
					source === "et" ? "ee" : // Ethiopia -> Estonia
					source;
			}
			$(this).css("backgroundImage", "url(/bundles/flag-icon-css/flags/4x3/" + correctLangCode($(this).attr("data-lang")) + ".svg)");
		});
	}, 1000);

	//Prevents select trigger from working within the CMS
	if (document.body.classList.contains('edit') || document.body.classList.contains('preview')) {
		return;
	}

	// Click event to open cusom select box  - quotes is being used as an identifier
	if ($(".language-icon").css('quotes') == '"“" "”"') {
		$(".language-icon").on("click", function() {
			if (!$(".language-icon").hasClass("active")) {
				$(".language-item").slideDown({
					start: function() {
						$(this).css({
							display: "flex"
						});
					}
				});
				$(".language-icon").addClass("active");
			} else if ($(".language-icon").hasClass("active")) {
				$(".language-icon").removeClass("active");
				$(".language-item").slideUp();
			}
		});
	}
});
/* End JS for preset "Language V2" */

/* JS for preset "Marquee V2" */
$(function() {
   $('.marquee-wrap').attr('data-items', $('.marquee-wrap > .inner').children().length);
});
/* End JS for preset "Marquee V2" */