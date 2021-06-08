$(function() {

    $(".selectCategoryColor").next("span").find(".select2-selection").css("background-color", "#CCCCCC");

    $(".selectCategoryColor").on("change", function(){
        $(this).next("span").find(".select2-selection").css("background-color", $(this).find("option:selected").attr("data-backgroundcolor"));
    });

    function generateDragEvent(title, category) {
        var generateID = moment();
        var eventObj = '{"id": "'+generateID+'","title": "'+title+'", "idCategory":'+category.id+', "stick": "true","backgroundColor": "'+category.color+'", "borderColor": "'+category.color+'"}';

        var htmlToAppend = "<div data-event='"+eventObj+"' class='draggable pendingEvent external-event' id='"+generateID+"' style='z-index: 100;background-color: "+category.color+";'>"+title+"<i style='margin-top: 3px;' class='fas fa-times float-right'></i></div>";

        $("#pengingEventList").append(htmlToAppend);
        $("#new-event-title").val("");

        new FullCalendar.Draggable($("#"+generateID).get(0));
    }

    $(document).on("click", "#add-new-event", function(){

        var eventTitle = $("#new-event-title").val();

        if(eventTitle == '') {
            toastr.error(FILL_TITLE_AGENDA);
            return;
        }

        var categoryID = $("#selectCategorySide").val();
        if(categoryID == "")
            categoryID = 0;
        var categoryColor = $("#selectCategorySide option:selected").attr("data-backgroundcolor");

        generateDragEvent(eventTitle, {
            id: categoryID,
            color: categoryColor
        });
    });

    $(document).on("click", ".external-event i.fas.fa-times", function(){
        $(this).parent("div").remove();
    });

    var calendarEl = document.getElementById('calendar');
    var calendar = new FullCalendar.Calendar(calendarEl, {
        schedulerLicenseKey: 'GPL-My-Project-Is-Open-Source',
        initialView: 'dayGridMonth',
        locale: calendarLocales.lang,
        timeZone: 'UTC',
        resourceAreaWidth: "15%",
        defaultTimedEventDuration: "04:00:00",
        editable: true,
        droppable: true,
        resourceAreaHeaderContent: calendarLocales.users,
        events: {
            url: '/URL_ROUTE/get_event',
            method: 'POST',
            extraParams: {}, /* Add extra params here */
            failure: function(err) {
                console.error(err);
                toastr.error(err.message);
            }
        },
        resources: usersRessources,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,customWeek,customTimelineDay,customTimelineWeek'
        },
        views: {
            customWeek: {
                type: 'timeGridWeek',
                buttonText: calendarLocales.week,
                slotDuration: "00:30:00"
            },
            customTimelineDay: {
                type: 'resourceTimeline',
                buttonText: calendarLocales.customTimelineDay
            },
            customTimelineWeek: {
                type: 'resourceTimelineWeek',
                buttonText: calendarLocales.customTimelineWeek,
                slotDuration: "24:00:00"
            }
        },
        eventReceive: function(info) {
            const event = calendar.getEventById(info.event.id);
            const resourceIds = event.getResources().map(x => x.id);
            
            /* Convert into good SQL format */
            var startDate = moment.utc(event.startStr).format("YYYY-MM-DD HH:mm:ss");
            var endDate = moment.utc(event.startStr).add(4, "h").format("YYYY-MM-DD HH:mm:ss");

            $.ajax({
                url: '/URL_ROUTE/add_event',
                type: 'POST',
                data: JSON.stringify({
                    title: info.event.title,
                    allday: info.event.allDay,
                    start: startDate,
                    end: endDate,
                    idCategory: info.event.extendedProps.idCategory || null,
                    resourceIds: resourceIds
                }),
                contentType: "application/json",
                success: function(createdEvent) {
                    // Update the tmp event id with the event created id
                    event.setProp('id', createdEvent.id);
                    // Regenerate new droppable event, with a new tmp id
                    generateDragEvent($(info.draggedEl).text(), {
                        id: $(info.draggedEl).data('event').idCategory,
                        color: $(info.draggedEl).data('event').backgroundColor
                    });
                    $(info.draggedEl).remove();
                },
                error: function(error) {
                    console.error(error);
                }
            });
        },
        eventResize: function(info) {

            /* Convert into good SQL format */
            var startDate = moment.utc(info.event.start).format("YYYY-MM-DD HH:mm:ss");
            var endDate = moment.utc(info.event.end).format("YYYY-MM-DD HH:mm:ss");

            $.ajax({
                url: '/URL_ROUTE/resize_event',
                type: 'POST',
                data: {
                    id: info.event.id,
                    start: startDate,
                    end: endDate
                },
                error: function(error) {
                    console.error(error);
                }
            });
        },
        eventDrop: function(info) {

            const event = calendar.getEventById(info.event.id);
            const resourceIds = event.getResources();

            /* Convert into good SQL format */
            const startDate = moment.utc(event.startStr).format("YYYY-MM-DD HH:mm:ss");

            let endDate;
            if(!event.end)
                endDate = moment.utc(event.startStr).add(4, "h").format("YYYY-MM-DD HH:mm:ss");
            else
                endDate = moment.utc(event.endStr).format("YYYY-MM-DD HH:mm:ss");

            $.ajax({
                url: '/URL_ROUTE/update_event_drop',
                type: 'POST',
                data: JSON.stringify({
                    id: event.id,
                    start: startDate,
                    end: endDate,
                    allDay: event.allDay,
                    resourceIds: resourceIds
                }),
                contentType: "application/json",
                error: function(error) {
                    console.error(error);
                }
            });
        },
        eventClick: function(info) {
            $("#modalUpdateID").val(info.event.id);
            $("#modalUpdateTitle").val(info.event.title);
            if (info.event.allDay) {
                $('#updateEventAllDayCheckbox').icheck('checked');
                $("#modalUpdateStartTime").prop("disabled", true);
                $("#modalUpdateEndTime").prop("disabled", true);
                $("#modalUpdateStartTime").val('00:00');
                $("#modalUpdateEndTime").val('00:00');
            } else {
                $('#updateEventAllDayCheckbox').icheck('unchecked');
                $("#modalUpdateStartTime").val(moment.utc(info.event.start).format("HH:mm"));
                $("#modalUpdateEndTime").val(moment.utc(info.event.end).format("HH:mm"));
            }

            if (info.event.extendedProps.idCategory != 0)
                $("#modalUpdateCategory").val(info.event.extendedProps.idCategory).trigger("change");

            $('#eventUpdateModal').modal('show');
        },
        dateClick: function(info) {
            $("#modalCreateStartDate").val(info.dateStr);

            if(info.allDay){
                $('#createEventAllDayCheckbox').icheck('checked');
                $("#modalCreateStartTime").prop("disabled", true);
                $("#modalCreateEndTime").prop("disabled", true);
                $("#modalUpdateStartTime").val('00:00');
                $("#modalUpdateEndTime").val('00:00');
            } else {
                /* Get the start hours when the user clicked in the calendar */
                $("#modalCreateStartTime").val(moment.utc(info.date).format("HH:mm"));
                /* Add 4 hours to default end time in create modal */
                $("#modalCreateEndTime").val(moment.utc(info.date).add(4, "hours").format("HH:mm"));
            }

            // In case of click on timeline view
            $("#modalCreateUser").val(null);
            if (typeof info.resource !== "undefined") {
                $("#modalCreateUser").val(info.resource.id)
            }

            $("#modalCreateTitle").val("");
            $("#modalCreateCategory").val("").trigger("change");
            $('#eventCreateModal').modal('show');
        }
    });
    calendar.render();

    /* Create event modal, all day checkbox managment */
    $(document).on("ifChanged", "#createEventAllDayCheckbox", function() {
        /* Disable start & end timepicker depend allDay checkbox state */
        if ($(this).icheck('update')[0].checked) {
            $("#modalCreateStartTime").prop("disabled", true);
            $("#modalCreateEndTime").prop("disabled", true);
            $("#modalUpdateStartTime").val('00:00');
            $("#modalUpdateEndTime").val('00:00');
        } else {
            $("#modalCreateStartTime").prop("disabled", false);
            $("#modalCreateEndTime").prop("disabled", false);
        }
    });

    /* Update event modal, all day checkbox managment */
    $(document).on("ifChanged", "#updateEventAllDayCheckbox", function() {
        /* Disable start & end timepicker depend allDay checkbox state */
        if ($(this).icheck('update')[0].checked) {
            $("#modalUpdateStartTime").prop("disabled", true);
            $("#modalUpdateEndTime").prop("disabled", true);
            $("#modalUpdateStartTime").val('00:00');
            $("#modalUpdateEndTime").val('00:00');
        } else {
            $("#modalUpdateStartTime").prop("disabled", false);
            $("#modalUpdateEndTime").prop("disabled", false);
        }
    });

    $(document).on("click", "#deleteEvent", function() {

        if(!confirm(DEL_CONFIRM_TEXT))
            return;

        var idEventToDelete = $("#modalUpdateID").val();
        $.ajax({
            url: '/URL_ROUTE/delete_event',
            type: 'POST',
            data: {
                id: idEventToDelete
            },
            context: this,
            success: function(data) {
                calendar.getEventById(idEventToDelete).remove();
                $('#eventUpdateModal').modal('hide');
            },
            error: function(error) {
                console.error(error);
            }
        });
    });

    $(document).on("click", "#updateEvent", function() {

        var eventId = $("#modalUpdateID").val();
        var event = calendar.getEventById(eventId);

        var newTitle = $("#modalUpdateTitle").val();
        var newCategory = $("#modalUpdateCategory").val();
        var newCategoryColor = $("#modalUpdateCategory").find("option:selected").data("backgroundcolor");
        var allDay = $("#updateEventAllDayCheckbox").icheck('update')[0].checked ? true : false;

        var startDate = moment(event.startStr).format("YYYY-MM-DD");
        var chosenTimeStart = $("#modalUpdateStartTime").val();
        var chosenTimeEnd = $("#modalUpdateEndTime").val();
        var newStartDate = startDate + " " + chosenTimeStart + ":00";
        var newEndDate;
        if(!event.end)
            newEndDate = startDate + " " + chosenTimeEnd + ":00";
        else
            newEndDate = moment(event.endStr).format('YYYY-MM-DD HH:mm:ss')

        if (!allDay && moment(newStartDate).diff(newEndDate) >= 0) {
            toastr.error(END_BEFORE_START_MSG);
            return false;
        }

        $.ajax({
            url: '/URL_ROUTE/update_event',
            type: 'POST',
            data: {
                id: eventId,
                f_title: newTitle,
                f_all_day: allDay,
                f_start_date: newStartDate,
                f_end_date: newEndDate,
                r_category: newCategory
            },
            success: function(updatedEvent) {

                event.setDates(updatedEvent.f_start_date, updatedEvent.f_end_date);
                event.setProp('title', newTitle);
                event.setAllDay(updatedEvent.f_all_day);
                event.setProp('backgroundColor', newCategoryColor);
                event.setProp('borderColor', newCategoryColor);
                event.setExtendedProp('idCategory', newCategory);
            
                $('#eventUpdateModal').modal('hide');
            },
            error: function(error) {
                console.error(error);
            }
        });
    });

    $(document).on("click", "#createEvent", function() {

        const newTitle = $("#modalCreateTitle").val();
        const newCategory = $("#modalCreateCategory").val();
        const newCategoryColor = $("#modalCreateCategory").find("option:selected").data("backgroundcolor");
        const allDay = $("#createEventAllDayCheckbox").icheck('update')[0].checked ? true : false;

        const startDate = moment($("#modalCreateStartDate").val()).format('YYYY-MM-DD');
        let chosenTimeStart = '00:00';
        let chosenTimeEnd = '00:00';
        if(!allDay) {
            chosenTimeStart = $("#modalCreateStartTime").val();
            chosenTimeEnd = $("#modalCreateEndTime").val();
        }
        const newStartDate = startDate + " " + chosenTimeStart + ":00";
        const newEndDate = startDate + " " + chosenTimeEnd + ":00";

        var resourceIds = [];
        if ($("#modalCreateUser").val() != null && $("#modalCreateUser").val() != "")
            resourceIds = [$("#modalCreateUser").val()];

        if (!allDay && moment(newStartDate).diff(newEndDate) >= 0) {
            toastr.error(END_BEFORE_START_MSG);
            return false;
        }

        $.ajax({
            url: '/URL_ROUTE/add_event',
            type: 'POST',
            data: JSON.stringify({
                title: newTitle,
                start: newStartDate,
                end: newEndDate,
                allday: allDay,
                idCategory: newCategory || null,
                resourceIds: resourceIds
            }),
            contentType: "application/json",
            success: function(createdEvent) {
                calendar.addEvent({
                    id: createdEvent.id,
                    title: createdEvent.f_title,
                    start: createdEvent.f_start_date,
                    end: createdEvent.f_end_date,
                    allDay: createdEvent.f_all_day,
                    backgroundColor: newCategoryColor,
                    borderColor: newCategoryColor,
                    idCategory: createdEvent.fk_id_agenda_category_category,
                    resourceIds: resourceIds
                }, true);
                $('#eventCreateModal').modal('hide');
            },
            error: function(err) {
                console.error(err);
                toastr.error(err);
            }
        });
    });

    /* Sidebar menu highlighting */
    var url = window.location.href;
    var current_url = url.split("/");
    var mainMenu = current_url[3];
    $("a[href='/" + mainMenu + "']").css("color", "#3c8dbc");
});