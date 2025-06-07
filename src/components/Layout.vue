<template>
    <div class="layout">
        <div class="header">
            <AppHeader />
        </div>
        <div class="navbar">
            <AppNavbar />
        </div>
        <div class="main">
            <AppMain />
        </div>
    </div>
</template>

<script setup lang='ts'>
import AppHeader from "./AppHeader";
import AppNavbar from "./AppNavbar";
import AppMain from "./AppMain";
</script>

<style lang='scss' scoped>
.layout {
    width: 100%;
    height: 100%;
}

/* 头部 */
.header {
    position: absolute;
    line-height: 50px;
    height: 40px;
    padding: 0px;
    top: 0px;
    left: 0px;
    right: 0px;
    background-color: aqua;
}

/* 左侧导航 */
.navbar {
    position: absolute;
    width: 20%;
    min-width: 200px;
    max-width: 300px;
    top: 40px;
    /* 把上边header的部分让出来 */
    left: 0px;
    bottom: 0px;
    overflow-y: auto;
    /* 纵坐标滚动条 */
}

/* 右侧主体区域 */
.main {
    position: absolute;
    top: 40px;
    left: 280px;
    /* 把左边navbar的部分让出来 */
    right: 0px;
    bottom: 0px;
    overflow-y: auto;
}
</style>