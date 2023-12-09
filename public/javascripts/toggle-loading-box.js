window.showLoadingBox = function() {
    $("body").append('<div class="background-overlay"></div>'); 
    $('#loadingBox').fadeIn();
}

window.hideLoadingBox = function() {
    $('#loadingBox').fadeOut();
    $(".background-overlay").remove(); 
}