// Format date depending on user language
function formatDate(value) {
    if (lang_user == "fr-FR")
        return moment(new Date(value)).format("DD/MM/YYYY");
    return moment(new Date(value)).format("YYYY-MM-DD");
}

// Prepend notification to notification list
function displayNotification(notification, isNew) {
    var notifHtml = `
        <a href="/notification/read/${notification.id}" class="dropdown-item">
            <i class="${notification.f_icon} mr-2" style="color: ${notification.f_color};"></i>&nbsp;${notification.f_title}
            <span class="float-right text-muted text-sm">&nbsp;${formatDate(notification.createdAt)}</span>
        </a>
    `;

    var currentNotifCount = 0;
    if ($("#notification-total").text() != "" && !isNaN($("#notification-total").text()))
        currentNotifCount = parseInt($("#notification-total").text());

    if (isNew !== false) {
        currentNotifCount++;
        $("#notification-total").text(currentNotifCount);
        $("#notification-header").text(currentNotifCount + " Notifications");
    }
    $("#notification-wrapper").prepend(notifHtml);
}

// Receive notification from server
socket.on('notification', displayNotification);

$(function() {

    // Load new notifications on scroll
    var lastNotifReached = false;
    $("#notification-wrapper").scroll(function() {
        if (lastNotifReached)
            return;

        var wrapper = $(this);

        // Scrollbar reached bottom
        if (wrapper[0].scrollHeight - wrapper.scrollTop() == wrapper.height()) {
            var notificationOffset = wrapper.children('a').length;

            $.ajax({
                url: '/notification/load/'+notificationOffset,
                success: function(notifications) {
                    // Block ajax calls if there is no more notification to load
                    if (notifications.length == 0)
                        lastNotifReached = true;
                    for (var i = 0; i < notifications.length; i++)
                        displayNotification(notifications[i], false);
                }
            });
        }
    });

    $(".delete-all").click(function() {
        $.ajax({
            url: '/notification/delete_all',
            success:function() {
                $("#notification-wrapper").text("");
                $("#notification-header").text(0);
                $("#notification-total").text("");
            }
        });
    });
});