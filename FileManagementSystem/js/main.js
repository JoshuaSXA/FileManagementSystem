//屏蔽浏览器对整个页面的右击事件监听
document.oncontextmenu = function() {
    return false;
}
$(document).on("click",function (e) {
    if(e.target.id != "menu"){
        $("div#menu").css("display", "none");
    }
});
//全局变量声明
var ParentDir = 0;
var CurDir = 0;
var CurFileName = "";
var CurFileList = [];
var fileType = "";
var modifyFileIndex = 0;
var cutFileInfo = {
    FileDir:-1,
    Filename:"",
    FileType:""
};
//初始化页面
initialFileContainer();

/*这一部分是一些点击监听事件*/
//页面加载完成后
$(document).ready(function(){
    //记录当前文件搜索状态
    var displayFileSearchRes = false;
    //记录鼠标位置信息
    var mousePosX = 0;
    var mousePosY = 0;
    //记录鼠标右击的文件id序号
    var fileIdRecord = "";
    //初始化隐藏文件名键入页面
    $("div.block-container").hide();
    //初始化隐藏文件重命名输入框
    $("div.rename-container").hide();
    //隐藏文本显示界面
    $("textarea.txt-content").hide();
    //隐藏保存按钮
    $("button.save-btn").hide();
    //调整样式属性
    $("img.return-btn").css("margin-right", "490px");

    /*该部分是Search Line的按钮监听事件函数*/
    //监听搜索按钮
    $("img.search-btn").click(function () {
        var targetFileName =  $("input.search-line-input").val();
        if(!checkFileName(targetFileName)){
            alert("Invalid filename!");
        }
        $.post("FileManagementSystem.php",
            {
                OperType: 11,
                CurDir: CurDir,
                filename: targetFileName
            },
            function(data,status){
                var json_data = JSON.parse(data);
                var SearchRes = json_data.SearchRes;
                if(json_data.Success){
                    clearFileContent();
                    for(var i = 0; i < SearchRes.length; ++i){
                        displaySearchRes(SearchRes[i], targetFileName);
                    }
                    displayFileSearchRes = true;
                }else{
                    alert("System Error!");
                }
            }
        );
    });

    /*该部分是touchbar的按钮监听事件函数*/
    //监听返回按钮
    $("img.return-btn").click(function () {
        if(displayFileSearchRes){
            clearFileContent();
            CurFileList = [];
            initialFileContainer();
            displayFileSearchRes = false;
            return;
        }
        if($("div.rename-container").is(':visible')){
            $("input.rename-input").val("");
            $("div.rename-alert").text("");
            $("div.rename-container").hide();
            return;
        }
        if($("textarea.txt-content").is(':visible')){
            $("textarea.txt-content").val("");
            $("textarea.txt-content").hide();
            $("button.save-btn").hide();
            $("img.return-btn").css("margin-right", "490px");
            CurDir = ParentDir;
            return;
        }
        if(CurDir == 0){
            return;
        }
        $.post("FileManagementSystem.php",
            {
                OperType: 8,
                CurDir: CurDir
            },
            function(data,status){
                var json_data = JSON.parse(data);
                CurFileList = [];
                CurDir = parseInt(json_data.id);
                clearFileContent();
                initialFileContainer();
            }
        );
    });
    //监听保存按钮
    $("button.save-btn").click(function () {
        var content = $("textarea.txt-content").val();
        $.post("FileManagementSystem.php",
            {
                OperType: 7,
                CurDir: CurDir,
                FileContent: content
            },
            function(data,status){
                var json_data = JSON.parse(data);
                var success = json_data.Success;
                if(success){
                    $("div.save-modal-container").css("display", "block");
                    setTimeout(function () {
                        $("div.save-modal-container").css("display", "none");
                    }, 1500);
                }else{
                    alert("Fail to Save the File!");
                }
            }
        );
    });
    //监听格式化系统按钮
    $("button.format-btn").click(function () {
        $.post("FileManagementSystem.php",
            {
                OperType: 0,
                CurDir: CurDir
            },
            function(data,status){
                var json_data = JSON.parse(data);
                var success = json_data.Success;
                if(success){
                    CurDir = 0;
                    CurFileName = "";
                    CurFileList = [];
                    clearFileContent();
                }else{
                    alert("System Error!");
                }
            }
        );
        return;
    });
    //监听New File按钮
    $("button.new-file-btn").click(function () {
        fileType = "txt";
        $("div.block-container").show();
    });
    //监听New Folder按钮
    $("button.new-folder-btn").click(function () {
        fileType = "dir";
        $("div.block-container").show();
    });


    /*该部分是文件名输入界面的按钮监听事件函数*/
    //取消键入文件名
    $("img.cancel-btn").click(function () {
        $("div.alert-container").text("");
        $("input.filename-text").val("");
        $("div.block-container").hide();
    });
    //清空输入框
    $("button.clear-btn").click(function () {
        $("input.filename-text").val("");
    });
    //监听确定按钮
    $("button.confirm-btn").click(function () {
        var filename = $("input.filename-text").val();
        //检测文件名中是否含有特殊字符
        if(!checkFileName(filename)){
            $("div.alert-container").text("Filename contained spacial characters!");
            return;
        }
        //检测文件名是否与现有文件重复
        if(!checkFileDuplication(filename, fileType)){
            $("div.alert-container").text("This file has already existed!");
            return;
        }
        $("div.alert-container").text("");
        $("input.filename-text").val("");
        //将创建文件的信息传递给后端
        var curTime = getCurrentTime();
        $.post("FileManagementSystem.php",
            {
                OperType: 1,
                CurDir: CurDir,
                filename: filename,
                time: curTime,
                type: fileType
            },
            function(data,status){
                var json_data = JSON.parse(data);
                var success = json_data.Success;
                if(success){
                    //在前端创建文件
                    addFile(filename, curTime, "img/" + fileType + ".png", CurFileList.length + 1);
                    $("div.block-container").hide();
                    var fileListElement = {
                        filename:filename,
                        time:curTime,
                        type:fileType,
                        content:null
                    };
                    CurFileList.push(fileListElement);
                }else{
                    //错误信息
                    $("div.alert-container").text("System error！");
                }
            }
        );
        return;
    });

    //该部分是重命名界面监听函数
    $("button.rename-confirm-btn").click(function () {
        var newName = $("input.rename-input").val();
        //检测文件名中是否含有特殊字符
        if(!checkFileName(newName)){
            $("div.rename-alert").text("Filename contained spacial characters!");
            return;
        }
        //检测文件名是否与现有文件重复
        if(!checkFileDuplication(newName, CurFileList[modifyFileIndex].type)){
            $("div.rename-alert").text("This file has already existed!");
            return;
        }
        $.post("FileManagementSystem.php",
            {
                OperType: 10,
                CurDir: CurDir,
                filename: CurFileList[modifyFileIndex].filename,
                TargetName: newName,
                type: CurFileList[modifyFileIndex].type
            },
            function(data,status){
                var json_data = JSON.parse(data);
                var success = json_data.Success;
                if(success){
                    //在前端创建文件
                    CurFileList[modifyFileIndex].filename = newName;
                    $("div#t-" + (modifyFileIndex + 1).toString()).text(newName);
                    $("input.rename-input").val("");
                    $("div.rename-alert").text("");
                    $("div.rename-container").hide();
                }else{
                    //错误信息
                    $("div.rename-alert").text("System error！");
                }
            }
        );
    });

    //监听鼠标右键点击
    $("div.show-content").on("mousedown", "div.file-unit", function(e){
        if(e.which != 3){
            return;
        }
        fileIdRecord = $(this).attr("id");
        $("div#menu").css("left", mousePosX.toString() + "px");
        $("div#menu").css("top", mousePosY.toString() + "px");
        $("div#menu").css("display", "block");
    });
    //监听鼠标位置
    $("div.show-content").on("mousemove", "div.file-unit", function (e) {
        mousePosX = e.originalEvent.x;
        mousePosY = e.originalEvent.y;
    });
    //当鼠标位于菜单元素上方时，改变菜单元素颜色
    $("div.menu").mouseover(function(e){
        var menuListSelector = "div#" + e.target.id;
        $(menuListSelector).css("background-color","#424242");
        $(menuListSelector).css("color","#ffffff");
    });
    //当鼠标移出时，改回菜单元素颜色
    $("div.menu").mouseout(function(e){
        var menuListSelector = "div#" + e.target.id;
        $(menuListSelector).css("background-color","#ffffff");
        $(menuListSelector).css("color","black");
    });
    //当鼠标点击菜单元素时
    $("div.menu").click(function () {
        var operNum = parseInt($(this).attr("id")[2]);
        var index = parseInt(fileIdRecord) - 1;
        var fileType = CurFileList[index].type;
        switch (operNum) {
            case 1:
                //打开文件
                if(fileType == "dir"){
                    openFolder(index);
                }else{
                    openFile(index);
                }
                break;
            case 2:
                //重命名文件
                modifyFileIndex = index;
                $("div.rename-container").show();
                break;
            case 3:
                //删除文件
                if(fileType == "dir"){
                    deleteFolder(index);
                }else{
                    deleteFile(index);
                }
                break;
            case 4:
                //剪切文件
                cutFileInfo.FileDir = CurDir;
                cutFileInfo.Filename = CurFileList[index].filename;
                cutFileInfo.FileType = fileType;
                break;
            case 5:
                //粘贴文件
                pasteFile();
                break;
        }
    });
});

//清空文件显示区域
function clearFileContent() {
    var parent = document.getElementById("file-con");
    while(parent.hasChildNodes()){
        parent.removeChild(parent.firstChild);
    }
}

//获取当前的系统时间
function getCurrentTime() {
    var date = new Date();
    var sign1 = "-";
    var sign2 = ":";
    var year = date.getFullYear() // 年
    var month = date.getMonth() + 1; // 月
    var day  = date.getDate(); // 日
    var hour = date.getHours(); // 时
    var minutes = date.getMinutes(); // 分
    var seconds = date.getSeconds() //秒
    // 给一位数数据前面加 “0”
    if (month >= 1 && month <= 9) {
        month = "0" + month;
    }
    if (day >= 0 && day <= 9) {
        day = "0" + day;
    }
    if (hour >= 0 && hour <= 9) {
        hour = "0" + hour;
    }
    if (minutes >= 0 && minutes <= 9) {
        minutes = "0" + minutes;
    }
    if (seconds >= 0 && seconds <= 9) {
        seconds = "0" + seconds;
    }
    var currentDate = year + sign1 + month + sign1 + day + " " + hour + sign2 + minutes + sign2 + seconds;
    return currentDate;
}

//检测文件名是否符合规范
function checkFileName(filename) {
    if(filename == ""){
        return false;
    }
    var regEn = /[`~!@#$%^&*()+<>?:"{},.\/;'[\]]/im;
    var regCn = /[·！#￥（——）：；“”‘、，|《。》？、【】[\]]/im;
    if(regEn.test(filename) || regCn.test(filename)) {
        //含有特殊字符的处理
        return false;
    }else{
        return true;
    }
}

//检查当前目录下是否有重名文件
function checkFileDuplication(filename, type) {
    for(var i = 0; i < CurFileList.length; ++i){
        if(CurFileList[i].filename == filename && CurFileList[i].type == type){
            return false;
        }
    }
    return true;
}

//在前端创建文件
function addFile(filename, time, imgSrc, tag) {
    var parent = document.getElementById("file-con");
    var file = document.createElement("div");
    var file_icon = document.createElement("img");
    //设置文件名
    var file_name = document.createElement("div");
    var text = document.createTextNode(filename);
    file_name.appendChild(text);
    //设置图标样式
    file_icon.src = imgSrc;
    file_icon.setAttribute("style", "width: 60px; height: 58px; margin: 0px 2.5px;");
    //设置文件名样式
    file_name.setAttribute("style", "width: 65px; height: 20px; font-size:14px; overflow: hidden;");
    file_name.setAttribute("id", "t-" + tag);
    //设置div样式
    file.setAttribute("style", "width: 65px; height: 78px; text-align: center; display: inline-block");
    file.setAttribute("id", tag);
    file.setAttribute("title", time);
    file.setAttribute("class", "file-unit");
    file.setAttribute("ondblclick", "doubleClickFileEvent(this)");
    file.appendChild(file_icon);
    file.appendChild(file_name);
    parent.appendChild(file);
}

//初始化文件显示区域
function initialFileContainer() {
    //向服务端请求第一级目录下文件的符号目录项
    $.post("FileManagementSystem.php",
        {
            OperType: 4,
            CurDir: CurDir,
        },
        function(data,status){
            var json_data = JSON.parse(data);
            for(var i = 0; i < json_data.length; ++i){
                //将文件目录项缓存到本地内存中
                CurFileList.push(json_data[i]);
                //在文件显示区显示
                addFile(CurFileList[i].filename, CurFileList[i].time,"img/" + CurFileList[i].type + ".png", (i + 1).toString());
            }
        }
    );
}

//鼠标双击监听事件
function doubleClickFileEvent(e) {
    var index = parseInt(e.getAttribute("id")) - 1;
    var FileType = CurFileList[index].type;
    if(FileType == "dir"){
        //打开的是文件夹
        openFolder(index);
    }else{
        //打开的是txt文件
        openFile(index);
    }
}
//打开文件夹,index可以看做是文件的索引
function openFolder(index) {
    var fileInfo = CurFileList[index];
    $.post("FileManagementSystem.php",
        {
            OperType: 5,
            CurDir: CurDir,
            filename:fileInfo.filename,
            type:fileInfo.type
        },
        function(data,status){
            var json_data = JSON.parse(data);
            CurFileList = [];
            CurDir = parseInt(json_data.id);
            clearFileContent();
            initialFileContainer();
        }
    );
}
//打开文本文件
function openFile(index) {
    var fileInfo = CurFileList[index];
    $.post("FileManagementSystem.php",
        {
            OperType: 6,
            CurDir: CurDir,
            filename:fileInfo.filename,
            type:fileInfo.type
        },
        function(data,status){
            var json_data = JSON.parse(data);
            ParentDir = CurDir;
            CurDir = parseInt(json_data.id);
            $("textarea.txt-content").show();
            $("button.save-btn").show();
            $("img.return-btn").css("margin-right", "429px");
            $("textarea.txt-content").val(json_data.content);
        }
    );
}


/*这里将文件夹的删除和文件的删除区分开来*/
//删除文件夹
function deleteFolder(index) {
    var fileInfo = CurFileList[index];
    $.post("FileManagementSystem.php",
        {
            OperType: 2,
            CurDir: CurDir,
            filename:fileInfo.filename
        },
        function(data,status){
            var json_data = JSON.parse(data);
            var success = json_data.Success;
            if(success){
                //处理删除完成后前端的显示
                deleteChange(index);
            }else{
                alert("System Error!");
            }
        }
    );
}
//删除文本文件
function deleteFile(index) {
    var fileInfo = CurFileList[index];
    $.post("FileManagementSystem.php",
        {
            OperType: 3,
            CurDir: CurDir,
            filename:fileInfo.filename
        },
        function(data,status){
            var json_data = JSON.parse(data);
            var success = json_data.Success;
            if(success){
                //处理删除完成后前端的显示问题
                deleteChange(index);
            }else{
                alert("System Error!");
            }
        }
    );
}
//删除文件之后，前端缓存的文件目录标识要进行相应修改
function deleteChange(index) {
    CurFileList.splice(index, 1);
    //修改后续标签的id属性
    $("div#" + (index + 1).toString()).remove();
    for(var i = index; i < CurFileList.length; ++i){
        $("div.show-content").children().eq(i).attr("id", (i + 1).toString());
    }
}

/*粘贴文件*/
function pasteFile() {
    //如果文件目录就是被粘贴文件原始目录，则不用做出任何修改
    if(cutFileInfo.FileDir == CurDir || cutFileInfo.FileDir == -1){
        return;
    }
    //这里需要判断此层文件目录下是否有文件重名
    if(!checkFileDuplication(cutFileInfo.Filename, cutFileInfo.FileType)){
        alert("Here exits a file with the same filename!");
        return;
    }
    //向服务端请求，修改文件目录结构信息
    $.post("FileManagementSystem.php",
        {
            OperType: 9,
            CurDir: CurDir,
            filename:cutFileInfo.Filename,
            type: cutFileInfo.FileType,
            RootDir: cutFileInfo.FileDir
        },
        function(data,status){
            var json_data = JSON.parse(data);
            var success = json_data.Success;
            if(success){
                //处理删除完成后前端的显示问题
                CurFileList = [];
                clearFileContent();
                initialFileContainer();
                cutFileInfo.FileDir = -1;
            }else{
                //错误情况处理
                alert("System Error!");
            }
        }
    );
}

/*搜索文件*/
//在页面上显示搜索结果，逐个添加元素
function  displaySearchRes(SearchResElement, filename) {
    var fileType = SearchResElement.type;
    var filePath = SearchResElement.path;
    var fileModifiedTime = SearchResElement.time;
    //创建标签
    var parent = document.getElementById("file-con");
    var file_con = document.createElement("div");
    var file_info = document.createElement("div");
    var file_name = document.createElement("div");
    var file_time = document.createElement("div");
    var file_path = document.createElement("div");
    var file_icon = document.createElement("img");
    //设置标签样式
    file_con.setAttribute("style", "width: 780px; height: 70px; box-sizing: border-box; border-bottom: 1px solid #8a8a8a;");
    file_info.setAttribute("style", "height: 70px; width: 250px; box-sizing: border-box; display: inline-block;  padding: 5px 0;vertical-align: top;");
    file_name.setAttribute("style", "height: 35px; line-height: 35px;font-size: 18px; font-weight: bold; overflow: hidden;");
    file_time.setAttribute("style", "height: 25px; line-height: 25px;font-size: 14px;");
    file_path.setAttribute("style", "margin-left: 100px;height: 40px; line-height: 40px;width: 350px; display: inline-block; vertical-align: top; text-align: left; font-size: 16px; overflow: hidden;");
    file_icon.setAttribute("style", "width: 70px; height: 70px;");
    file_icon.setAttribute("src", "img/" + fileType + ".png");
    //设置标签显示文字内容
    var name_text = document.createTextNode(filename);
    var time_text = document.createTextNode(fileModifiedTime);
    var path_text = document.createTextNode(filePath);
    file_name.appendChild(name_text);
    file_time.appendChild(time_text);
    file_path.appendChild(path_text);
    //标签嵌套关系
    file_con.appendChild(file_icon);
    file_info.appendChild(file_name);
    file_info.appendChild(file_time);
    file_con.appendChild(file_info);
    file_con.appendChild(file_path);
    parent.appendChild(file_con);
}
