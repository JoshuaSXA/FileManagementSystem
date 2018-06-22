<?php
/**
* 定义文件系统管理类
*/
class FileManagementSystem {
    
    private $HostIP;
    private $Connection;
    private $OperType;
    private $CurDir;

    function __construct()
    {
        //获取客户端端IP
        $this->HostIP = str_replace('.', '_', $_SERVER['REMOTE_ADDR']);
        //获取此次文件系统操作类型
        $this->OperType = $_POST['OperType'];
        //获取当前文件目录
        $this->CurDir = $_POST['CurDir'];
    }

    //此方法负责建立与数据库的连接
    private function ConnectDatabase(){
        $servername = "127.0.0.1";
        $username = "shenxiaoang";
        $password = "981128";
        $mysql_database = "os";
        $this->Connection = mysqli_connect($servername, $username, $password);  
        if (!$this->Connection) {  
            die('connect error: ' . mysqli_error($this->Connection));
            return FALSE;
        };  
        mysqli_query($this->Connection,'set names utf8');
        mysqli_select_db($this->Connection,$mysql_database);
        return TRUE;
    }

    //检查文件系统是否在历史记录中
    private function CheckLogStatus(){
        $SQL = "SELECT * FROM user WHERE ip = " . "'" . $this->HostIP . "'";
        $RetVal = mysqli_query($this->Connection, $SQL);
        if(!$RetVal){
            return FALSE;
        }
        $ResNum = mysqli_num_rows($RetVal);
        if($ResNum == 0){
            if(!$this->CreateFileSystem()){
                return FALSE; 
            };
        }
        return TRUE;
    }

    //创建文件系统
    private function CreateFileSystem(){
        //为保证原子性，这里关闭数据库的自动提交功能
        mysqli_autocommit($this->Connection, FALSE);
        //创建文件目录表，存储文件的符号目录项
        $SQL = "CREATE TABLE IF NOT EXISTS " . $this->HostIP . "(" .
               "id INT UNSIGNED AUTO_INCREMENT, " . 
               "parent INT UNSIGNED, " . 
               "filename VARCHAR(64) NOT NULL, " . 
               "time VARCHAR(25) NOT NULL, " . 
               "type VARCHAR(5) NOT NULL, " .
               "content VARCHAR(1024), " . 
               "PRIMARY KEY (id))ENGINE=InnoDB DEFAULT CHARSET=utf8;";
        mysqli_query($this->Connection, $SQL);
        //将此IP作为用户辨识符插入用户列表
        $SQL = "INSERT INTO user (ip) VALUES ('$this->HostIP')";
        mysqli_query($this->Connection, $SQL);
        if(!mysqli_commit($this->Connection)){
            //回滚
            mysqli_rollback($this->Connection);
            return FALSE;
        }
        mysqli_autocommit($this->Connection, TRUE);
        return TRUE;
    }

    //格式化数据库系统
    private function FormatFileSystem(){
        //删除此用户的的所有文件
        $SQL = "DELETE FROM " . $this->HostIP;
        $RetVal = mysqli_query($this->Connection, $SQL);
        if(!$RetVal){
            echo json_encode(array('Success' => FALSE));
            return FALSE;
        }else{
            echo json_encode(array('Success' => TRUE));
            return TRUE;
        }
    }

    //新建文件夹
    private function MakeDir(){
        //文件名需要去敏
        $filename = $_POST['filename'];
        $time = $_POST['time'];
        $type = $_POST['type'];
        //向文件目录中新建项
        $SQL = "INSERT INTO " . $this->HostIP . " (parent, filename, time, type) VALUES " . 
               "($this->CurDir, '$filename', '$time', '$type')";
        $RetVal = mysqli_query($this->Connection, $SQL);
        if(!$RetVal){
            echo json_encode(array('Success' => FALSE));
            return FALSE;
        }else{
            echo json_encode(array('Success' => TRUE));
            return TRUE;
        }
    }

    //删除文本文件
    private function DeleteFile(){
        $filename = $_POST['filename'];
        $type = "txt";
        $SQL = "DELETE FROM " . $this->HostIP . " WHERE parent = " . $this->CurDir .
               " AND filename = " . "'" . $filename . "'" . " AND type = " .
               "'" . $type . "'";
        $RetVal = mysqli_query($this->Connection, $SQL);
        if(!$RetVal){
            echo json_encode(array('Success' => FALSE));
            return FALSE;
        }
        echo json_encode(array('Success' => TRUE));
        return TRUE;               
    }

    //删除文件夹
    private function DeleteDir(){
        $filename = $_POST['filename'];
        if(!$this->SubDeleteDir($this->CurDir, $filename, "dir")){
            echo json_encode(array('Success' => FALSE));
            return FALSE;
        }
        echo json_encode(array('Success' => TRUE));
        return TRUE;
    }
    //递归删除指定文件夹下的所有文件
    private function SubDeleteDir($CurDir, $filename, $type){
        if($type == "dir"){
            //搜索文件的FCB，获取其中的父节点信息，和符号目录项信息
            $SQL = "SELECT " . 
                   "(SELECT id FROM " . $this->HostIP . " WHERE parent = " . $CurDir .
                   " AND filename = " . "'" . $filename . "'" . " AND type = " . "'" . $type . "'" . ")" . 
                   ", filename, type FROM " . $this->HostIP . " WHERE parent = " . 
                   "(SELECT id FROM " . $this->HostIP . " WHERE parent = " . $CurDir .
                   " AND filename = " . "'" . $filename . "'" . " AND type = " . "'" . $type . "'" . ")";
            $RetVal = mysqli_query($this->Connection, $SQL);
            if(!$RetVal){
                return FALSE;
            }
            while ($row=mysqli_fetch_row($RetVal)) {
                if(!$this->SubDeleteDir($row[0], $row[1], $row[2])){
                    return FALSE;
                }
            }
        }
        $SQL = "DELETE FROM " . $this->HostIP . " WHERE parent = " . $CurDir .
               " AND filename = " . "'" . $filename . "'" . " AND type = " . "'" . $type . "'";
        $RetVal = mysqli_query($this->Connection, $SQL);
        if(!$RetVal){
            return FALSE;
        }
        return TRUE;
    }

    //获取此层级目录下的所有文件的FCB
    private function ShowDir($CurDir){
        $SQL = "SELECT filename, time, type, content FROM " . $this->HostIP . " WHERE parent = " . $CurDir;
        $RetVal = mysqli_query($this->Connection, $SQL);
        if(!$RetVal){
            return FALSE;
        } 
        $RetData =  mysqli_fetch_all($RetVal, MYSQLI_ASSOC);
        echo json_encode($RetData);
        return TRUE;
    }

    //获取当前文件目录下的指定文件的文件的索引
    private function GetDirContentById(){
        $filename = $_POST['filename'];
        $type = $_POST['type'];
        $SQL = "SELECT id FROM " . $this->HostIP . " WHERE parent = " . $this->CurDir . 
               " AND filename = " . "'" . $filename . "'" . " AND type = " . "'" . $type . "'"; 
        $RetVal = mysqli_query($this->Connection, $SQL);
        if(!$RetVal){
            return FALSE;
        }
        $QueryRes = mysqli_fetch_assoc($RetVal);
        $id = $QueryRes['id'];
        echo json_encode(array("id"=> $id));
        return TRUE;
    }

    //修改文件名
    private function ModifyDirName(){
        $filename = $_POST['filename'];
        //文件名需要去敏
        $TargetName = $_POST['TargetName'];
        //模拟更新文件的FCB
        $SQL = "UPDATE " . $this->HostIP . " SET filename = " . "'" . $TargetName . "'" .
               " WHERE parent = " . $this->CurDir . " AND filename = " . "'" . $filename . "'";
        $RetVal = mysqli_query($this->Connection, $SQL);
        if(!$RetVal){
            echo json_encode(array('Success' => FALSE));
            return FALSE;
        }
        echo json_encode(array('Success' => TRUE));
        return TRUE;
    }

    //打开文本文件
    private function OpenFile(){
        $filename = $_POST['filename'];
        $type = $_POST['type'];
        //这里通过模拟搜索符号目录项来
        $SQL = "SELECT id, content FROM " . $this->HostIP . " WHERE parent = " . $this->CurDir . " AND filename = " . 
               "'" . $filename . "'" . " AND type = " . "'" . $type . "'";
        $RetVal = mysqli_query($this->Connection, $SQL);
        if(!$RetVal){
            return FALSE;
        }
        $QueryRes = mysqli_fetch_assoc($RetVal);
        $id = $QueryRes['id'];
        $content = $QueryRes['content'];
        echo json_encode(array("id" => $id, "content" => $content));
        return TRUE;
    }

    //返回上一级文件目录
    private function ReturnToLastPage(){
        //从文件目录表中获取该层文件目录的父节点
        $SQL = "SELECT parent FROM " . $this->HostIP . " WHERE id = " . $this->CurDir;
        $RetVal = mysqli_query($this->Connection, $SQL);
        if(!$RetVal){
            return FALSE;
        }
        $QueryRes = mysqli_fetch_assoc($RetVal);
        $id = $QueryRes['parent'];
        echo json_encode(array("id"=> $id));
        return TRUE;
    }

    //保存文本文件中的内容
    private function SaveFile(){
        $FileContent = $_POST['FileContent'];
        //搜索、更新文件内容
        $SQL = "UPDATE " . $this->HostIP . " SET content = " . "'" . $FileContent . "'" .
               " WHERE id = " . $this->CurDir;
        $RetVal = mysqli_query($this->Connection, $SQL);
        if(!$RetVal){
            echo json_encode(array('Success' => FALSE));
            return FALSE;
        }
        echo json_encode(array('Success' => TRUE));
        return TRUE;
    }

    //移动文件
    private function MoveFile(){
        $filename = $_POST['filename'];
        $type = $_POST['type'];
        //此处为文件原始的目录
        $RootDir = $_POST['RootDir'];
        //修改更新文件的目录
        $SQL = "UPDATE " . $this->HostIP . " SET parent = " . $this->CurDir .
               " WHERE parent = " . $RootDir . " AND filename = " . "'" . $filename . "'" .
               " AND type = " . "'" . $type . "'";
        $RetVal = mysqli_query($this->Connection, $SQL);
        if(!$RetVal){
            echo json_encode(array('Success' => FALSE));
            return FALSE;
        }   
        echo json_encode(array('Success' => TRUE));
        return TRUE;    
    }

    //搜索文件
    private function SearchFile(){
        $filename = $_POST['filename'];
        $SQL = "SELECT parent, type, time FROM " . $this->HostIP . " WHERE filename = " . "'" . $filename . "'";
        $RetVal = mysqli_query($this->Connection, $SQL);
        if(!$RetVal || ($RetVal && !mysqli_num_rows($RetVal))){
            echo json_encode(array('Success' => FALSE, "SearchRes" => array()));
            return FALSE;
        }
        $SearchRes = array();
        $SearchElement = array("type" => "", "path" => "", "time" => "");
        $initialPath = $filename;
        //这里针对文件目录里面的每一个匹配文件，逐层递归搜索其文件路径
        while ($row=mysqli_fetch_row($RetVal)) {
            $SearchElement["type"] = $row[1];
            $SearchElement["time"] = $row[2];
            if($row[1] == "txt"){
                $initialPath .= ".txt";
            }
            $SearchElement["path"] = $this->FilePathSearch($initialPath, $row[0]);
            array_push($SearchRes, $SearchElement);
        }
        echo json_encode(array('Success' => TRUE, "SearchRes" => $SearchRes));
        return TRUE;        
    }
    //搜索指定文件的上一级文件路径
    private function FilePathSearch($CurPath, $parent){
        if($parent == 0){
            //到达根节点，停止搜索
            return "@root/" . $CurPath;
        }
        $SQL = "SELECT parent, filename FROM " . $this->HostIP . " WHERE id = " . $parent;
        $RetVal = mysqli_query($this->Connection, $SQL);
        echo mysqli_error($this->Connection);
        $QueryRes = mysqli_fetch_assoc($RetVal);
        return  $this->FilePathSearch($QueryRes["filename"] . "/" . $CurPath, $QueryRes["parent"]);
    }

    //此方法负责类中所有功能函数的调度，通过操作数直接与客户端交互
    public function FileManagement(){
        if(!$this->ConnectDatabase() || !$this->CheckLogStatus()){
            echo FALSE;
        }
        switch ($this->OperType) {
            case 0:
                $this->FormatFileSystem();
                break;
            case 1:
                $this->MakeDir();
                break;
            case 2:
                $this->DeleteDir();
                break;
            case 3:
                $this->DeleteFile();
                break;
            case 4:
                $this->ShowDir($this->CurDir);
                break;
            case 5:
                $this->GetDirContentById();
                break;
            case 6:
                $this->OpenFile();
                break;
            case 7:
                $this->SaveFile();
                break;
            case 8:
                $this->ReturnToLastPage();
                break;
            case 9:
                $this->MoveFile();
                break;
            case 10:
                $this->ModifyDirName();
                break;
            case 11:
                $this->SearchFile();
                break;
        }
        //关闭数据库连接
        mysqli_close($this->Connection);
    }
}

//实例化FileManagementSystem
$obj = new FileManagementSystem();
//调用FileManagement方法
$obj->FileManagement();
?>