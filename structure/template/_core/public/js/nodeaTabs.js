var NodeaTabs;
$(function() {
    NodeaTabs = (function() {
        var currentTab = {};
        var sourceId = $("input[name=sourceId]").val();
        var sourceName = $("input[name=sourceName]").val().substring(2);

        function buildAssociationHref(tab) {
            var associationData = {
                associationAlias: tab.data('asso-alias'),
                associationForeignKey: tab.data('asso-foreignkey'),
                associationFlag: tab.data('asso-flag'),
                associationSource: tab.data('asso-source'),
                associationUrl: tab.data('asso-url')
            };
            var href = '';
            for (var prop in associationData)
                href += prop+'='+associationData[prop]+'&';
            return href;
        }

        function reloadTab() {
            $(currentTab.href+'-click').click();
        }

        function loadTab(href) {
            var tab = $(href);
            if (currentTab.overlay === true)
                closeOverlay();

            currentTab = {
                tab,
                href,
                id: tab.attr('id'),
                overlay: false
            };
            // Set tab hash to URL
            location.hash = currentTab.id;

            // Show actions button bar only in home tab
            $(".actions")[href === "#home" ? 'slideDown' : 'hide']();

            // Not ajax tab, don't bind anything (ie: #home)
            if (!tab.hasClass('ajax-tab'))
                return;

            var subentityAlias = tab.prop('id');

            // Build url.
            var url = '/' + sourceName + '/loadtab/' + sourceId + '/' + subentityAlias + '?ajax=true&' + buildAssociationHref(tab);

            // Loading icon until ajax callback
            tab.find('.ajax-content').html('<div style="width:100%;text-align:center;"><i class="fa fa-circle-o-notch fa-spin fa-3x" style="color:#ABABAB;margin-top: 100px;margin-bottom: 100px;"></i></div>');
            $.ajax({
                url: url,
                success: function(data) {
                    try {
                        tab.find('.ajax-content').html(data);
                    } catch(err) {
                        tab.find('.ajax-content').html('<div style="width:100%;text-align:center;"><i class="fa fa-exclamation-circle fa-3x" style="color:#ff3333;margin-top: 100px;margin-bottom: 100px;"></i></div>');
                        console.error("Couldn't load tab content");
                        console.error(err);
                    }
                },
                error: function(pa1, pa2, pa3) {
                    if (pa1.status == 404)
                        return toastr.error('Unable to find '+subentityAlias);
                    console.error(pa1, pa2, pa3);
                    tab.find('.ajax-content').html('<div style="width:100%;text-align:center;"><i class="fa fa-exclamation-circle fa-3x" style="color:#ff3333;margin-top: 100px;margin-bottom: 100px;"></i></div>');
                }
            });
        }

        function loadOverlay(url, event) {
            var tab = currentTab.tab;
            if (!tab)
                return true;

            if (event) {
                // Don't reload page
                event.stopPropagation();
                // Don't change URL hash
                event.preventDefault();
            }

            const urlComplement = 'ajax=true&' + buildAssociationHref(tab);
            let overlayUrl;
            if (url.includes('?'))
                overlayUrl = url + '&'+urlComplement;
            else
                overlayUrl = url + '?'+urlComplement;
            $.ajax({
                url: overlayUrl,
                success: function(overlayContent) {
                    currentTab.overlay = true;
                    tab.find('.ajax-content').after(`<div class="ajax-overlay" style="display: none;">${overlayContent}</div>`);
                    tab.find('.ajax-content').hide()
                    tab.find(".ajax-overlay").slideDown();
                },
                error: function (...all) {
                    console.error(all);
                }
            });
        }

        function closeOverlay() {
            try {
                currentTab.overlay = false;
                currentTab.tab.find('.ajax-overlay').slideUp().remove();
                currentTab.tab.find('.ajax-content').slideDown();
            } catch(err) {
                console.error("Couldn't close overlay");
                console.error(err);
            }
        }

        // Bind tab and overlay loading
        $(".nav-tabs > li > a").click(function() {
            loadTab($(this).attr('href'));
            // Force map size recaculation after short period of time, tweak to fix map disappearing when switching tab
            setTimeout(function() {
                addressMapsInstance.map(x => x.updateSize());
            }, 500);
        });

        $(document).on('click', 'a.ajax', function(event) {
            loadOverlay($(this).data('href') || $(this).attr('href'), event);
        });

        // Trigger landing tab loading
        if (location.hash != "" && location.hash != "#home") {
            $("#" + location.hash.substring(1) + "-click").trigger("click");
            $("html, body").animate({ scrollTop: 0 }, "fast");
        }

        return {
            get current() {return currentTab},
            loadTab,
            reloadTab,
            loadOverlay,
            closeOverlay,
            buildAssociationHref
        }
    })();
});