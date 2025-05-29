<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const email = ref('')
const password = ref('')
function login_home(): void {
  console.log(email.value, password.value)
  if (email.value === '' && password.value === '') {
    router.push('/home')
  }
}
</script>

<template>
  <form>
    <div class="segment">
      <h1>欢迎</h1>
    </div>
    <label>
      <input v-model="email" type="text" placeholder="账户" />
    </label>
    <label>
      <input v-model="password" type="password" placeholder="密码" />
    </label>
    <button class="red" type="button" @click="login_home">登入</button>
  </form>
</template>

<!-- <style scoped lang="scss">
@import url(@/assets/signup.scss);
</style> -->
