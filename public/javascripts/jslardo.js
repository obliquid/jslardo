
/* #### FUNCTIONS #### */



/* crockford */

var is_array = function (value) {
	//versione easy: return value && typeof value === 'object' && value.constructor === Array;
	return Object.prototype.toString.apply(value) === '[object Array]'; //questo va anche per array definiti in altre windows o frame
};

var in_array = function (arr,obj) {
    return (arr.indexOf(obj) != -1);
}

Array.prototype.remove= function(){
	//alert('beppe!');
	var index = this.indexOf(arguments[0]);
	this.splice(index, 1);
	return this;
	/*
    var what, a= arguments, L= a.length, ax;
    while(L && this.length){
        what= a[--L];
        while((ax= this.indexOf(what))!= -1){
            this.splice(ax, 1);
        }
    }
    return this;
	*/
}




/* JQUERY PLUGINS */

//center a div on screen
//usage: $(element).center()
jQuery.fn.center = function () {
    //this.css("top", "0px");
    //this.css("left", "0px");
	//alert(window.pageYOffset);
    this.css("position","absolute");
    this.css("top", (($(window).height() - this.outerHeight()) / 2) + $(window).scrollTop() + "px");
    this.css("left", (($(window).width() - this.outerWidth()) / 2) + $(window).scrollLeft() + "px");
    return this;
}

//open modal iframe popup
function openModal(src, width) {
	if ( !width ) width = 700;
	var elementId = 'orcodio';
	var originalYScroll = window.pageYOffset;
	var modalFrame = $.modal('<iframe id="'+ elementId +'" src="' + src + '" width="' + width + '" onload="centerModal(this,' + originalYScroll + ')" style="border:0">', {
		closeHTML:'',
		containerCss:{
			backgroundColor:"#fff",
			borderColor:"#fff",
			width:width,
			padding:0,
			margin:0
		},
		overlayClose:true,
		autoPosition:false,
		modal:true,
		opacity:70
	});
}
function centerModal(f, originalYScroll) {
	$(window).scrollTop(originalYScroll);
    $('#simplemodal-container').css("top", "0px");
    $('#simplemodal-container').css("left", "0px");
	
	f.style.height = f.contentWindow.document.body.scrollHeight + 'px';
	$('#simplemodal-container').height(f.contentWindow.document.body.scrollHeight);
	$('#simplemodal-container').center();
}


//data() selector
(function($){
 
    // Extend jQuery's native ':'
    $.extend($.expr[':'],{
 
        // New method, "data"
        data: function(a,i,m) {
 
            var e = $(a).get(0), keyVal;
 
            // m[3] refers to value inside parenthesis (if existing) e.g. :data(___)
            if(!m[3]) {
 
                // Loop through properties of element object, find any jquery references:
                for (var x in e) { if((/jQuery\d+/).test(x)) { return true; } }
 
            } else {
 
                // Split into array (name,value):
                keyVal = m[3].split('=');
 
                // If a value is specified:
                if (keyVal[1]) {
 
                    // Test for regex syntax and test against it:
                    if((/^\/.+\/([mig]+)?$/).test(keyVal[1])) {
                        return
                         (new RegExp(
                             keyVal[1].substr(1,keyVal[1].lastIndexOf('/')-1),
                             keyVal[1].substr(keyVal[1].lastIndexOf('/')+1))
                          ).test($(a).data(keyVal[0]));
                    } else {
                        // Test key against value:
                        return $(a).data(keyVal[0]) == keyVal[1];
                    }
 
                } else {
 
                    // Test if element has data property:
                    if($(a).data(keyVal[0])) {
                        return true;
                    } else {
                        // If it doesn't remove data (this is to account for what seems
                        // to be a bug in jQuery):
                        $(a).removeData(keyVal[0]);
                        return false;
                    }
 
                }
            }
 
            // Strict compliance:
            return false;
 
        }
 
    });
})(jQuery);













/* #### THEN THINGS TO DO ON READY #### */


$(document).ready(
	function()
	{
	}
);

	
	
	
/* #### FINALLY THINGS TO DO ON LOAD (AFTER ALL IMAGES ARE LOADED) #### */

	
$(window).load(
	function()
	{
	}
);
	

