/*!
 * Nodea v3.1
 * Copyright 2016
 * Licensed under GPLV3.0 https://www.gnu.org/licenses/gpl.html
 */

function fetchStatus() {
    $.ajax({
        url: '/instruction_script/status',
        success: function(data) {
            try {

                // Skip current update status due to internal serveur error
                if(data.skip){
                    setTimeout(fetchStatus, 500);
                    return;
                }

                $("#instructionCount").text('Instructions : ' + data.doneInstruction + ' / ' + data.totalInstruction);

                var percent = (Number(data.doneInstruction) * 100 / Number(data.totalInstruction)).toFixed(0);
                var str = percent + "%";
                $("#progressbar").width(str);

                data.answers = data.answers.reverse();
                for (var i = 0; i < data.answers.length; i++) {
                    if (data.answers[i].instruction){
                        if(data.answers[i].error) {
                            $("#answers").html("<i>" + data.answers[i].instruction + "</i>:<br><span style='color: #ff2700;'><i class='fa fa-exclamation-circle'></i>&nbsp;&nbsp;<b>" + data.answers[i].message + "</b></span><br><br>" + $("#answers").html());
                            if(data.data) {
                                $("#goTo").replaceWith(
                                    `<button type='button' class="btn btn-danger deleteAppForm fromScript" data-name='${data.data.application._displayName}' data-codename='${data.data.application._name}'>
                                        <i class="fa fa-trash fa-md"></i>&nbsp;&nbsp;
                                        <span>Supprimer l'application</span>
                                    </button><br><br>`).show();
                            }
                        }
                        else
                            $("#answers").html("<i>" + data.answers[i].instruction + "</i>:<br><span style='color: #007A2E;'><i class='fa fa-check'></i>&nbsp;&nbsp;<b>" + data.answers[i].message + "</b></span><br><br>" + $("#answers").html());
                    }
                    else
                        $("#answers").html("<b>" + data.answers[i].message + "</b><br><br>" + $("#answers").html());
                }

                if (!data.over)
                    setTimeout(fetchStatus, 500);
                else if (percent >= 100) {
                    window.location.href = "/application/preview/" + data.data.app_name + "?timeout=75000";
                    $("#goTo").show();
                    $("#scriptSubmit").prop('disabled', false);
                    $("#progressbarcontent").hide();
                } else {
                    // Wait 2 sec before let user click again on button
                    setTimeout(function() {
                        $("#scriptSubmit").prop('disabled', false);
                        $("#scriptSubmit").fadeIn();
                    }, 2000);
                    $("#progressbarcontent").hide();
                }
            } catch (err) {
                console.error(err);
            }
        },
        error: function(err) {
            console.error(err);
            setTimeout(fetchStatus, 500);
        }
    });
}

$(function() {

    // Get last written script
    var lastWrittenScript = JSON.parse(localStorage.getItem("nodea_last_written_script"));
    if(!lastWrittenScript)
        lastWrittenScript = [];

    for (var i = 0; i < lastWrittenScript.length; i++) {
        if(i == 4)
            break;
        $('#last_written_script').append(`
            <div class="card card-primary">
                <div class="card-header">
                    <h4 class="card-title">
                        <a data-toggle="collapse" data-parent="#last_written_script" href="#collapse${i}" class="collapsed" aria-expanded="false">
                            <b>${lastWrittenScript[i].date}</b>
                        </a>
                    </h4>
                    <div class="text-right">
                        <a href="#" class="use-last-script text-right" data-index=${i}>&nbsp;<i class="fa fa-clipboard"></i></a>
                    </div>
                </div>
                <div id="collapse${i}" class="panel-collapse in collapse" style="">
                    <div class="card-body">
                        ${lastWrittenScript[i].content}
                    </div>
                </div>
            </div>
        `);
    }

    $(document).on('click', '.use-last-script', function(){
        $("#createScriptTextarea").val(lastWrittenScript[$(this).attr('data-index')].content)
    })

    $("#instructionsScript").on('submit', function() {
        $("#goTo").hide();
        $("#scriptSubmit").prop('disabled', true);
        $("#scriptSubmit").hide();

        if($("#addScript").css("display") == "none"){
            var formData = new FormData($(this)[0]);

            $.ajax({
                url: $(this).attr('action'),
                method: 'post',
                contentType: false,
                processData: false,
                data: formData,
                success: function() {
                    $("#progressbarcontent").show();
                    if (user_lang == 'en-EN')
                        $("#progress_title").text('Executing instructions...');
                    else if (user_lang == 'fr-FR')
                        $("#progress_title").text('Exécution des instructions du fichier...');
                    setTimeout(fetchStatus, 50);
                },
                error: function(err) {
                    console.error(err);
                }
            });
        } else {
            // Avoid store multiple time the same written script
            if(!$("#template_entry").val() &&
                (lastWrittenScript.length == 0 || $("#createScriptTextarea").val() != lastWrittenScript[0].content)) {
                lastWrittenScript.unshift({
                    date: moment().format("DD MMM, HH:mm"),
                    content: $("#createScriptTextarea").val()
                });
                localStorage.setItem("nodea_last_written_script", JSON.stringify(lastWrittenScript));
            }

            $.ajax({
                url: $(this).attr('action') + "_alt",
                method: 'post',
                data: JSON.stringify({
                    template_entry: $("#template_entry").val(),
                    text: $("#createScriptTextarea").val()
                }),
                contentType: "application/json",
                processData: false,
                success: function() {
                    $("#progressbarcontent").show();
                    if (user_lang == 'en-EN')
                        $("#progress_title").text('Executing instructions...');
                    else if (user_lang == 'fr-FR')
                        $("#progress_title").text('Exécution des instructions....');
                    setTimeout(fetchStatus, 50);
                },
                error: function(err) {
                    console.error(err);
                }
            });
        }
        return false;
    });

    $(document).on("click", "#createScript", function(){
        $(this).hide();
        $("#addScriptInput").hide();
        $("#addScriptInput").prop("required", false);
        $("#createScriptTextarea").prop("required", true);
        $("#createScriptTextarea").show();
        $("#last_written_script").show();
        $("#addScript").show();
    });

    $(document).on("click", "#addScript", function(){
        $(this).hide();
        $("#createScriptTextarea").hide();
        $("#last_written_script").hide();
        $("#createScriptTextarea").prop("required", false);
        $("#addScriptInput").prop("required", true);
        $("#addScriptInput").show();
        $("#createScript").show();
    });
});
