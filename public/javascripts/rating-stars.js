window.letRate = function (numberOfStar) {
    console.log('Let"s rate ', numberOfStar);
    const data = {
        numberOfStar,
    };
    $.ajax({
        method: 'POST',
        url: '/rating-stars',
        data: data,
        success: function(sweetResponse) {
            console.log('success = ', sweetResponse);
            if(sweetResponse.icon === "success") {
                swal({
                    title: sweetResponse.title,
                    text: sweetResponse.text,
                    icon: sweetResponse.icon
                });
            }
        }, error: function(e) {
            console.error(e);
        }
    });
}
  