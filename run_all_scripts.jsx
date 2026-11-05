// @target illustrator

(function () {
    var scriptFolder = new File($.fileName).parent;

    $.global.HLJOMUR_RUN_ALL = true;

    $.evalFile(new File(scriptFolder.fsName + "/layer_merge_script.jsx"));
    $.evalFile(new File(scriptFolder.fsName + "/minningarplatti_script.jsx"));

    $.global.HLJOMUR_RUN_ALL = false;
})();
