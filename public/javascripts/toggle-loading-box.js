window.showLoadingBox = function() {
    $("body").append('<div class="background-overlay"></div>'); 
    $('#loadingDiv').fadeIn();
}

window.hideLoadingBox = function() {
    $('#loadingDiv').fadeOut();
    $(".background-overlay").remove(); 
}