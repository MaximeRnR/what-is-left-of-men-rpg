import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'character-list',
      component: () => import('../views/CharacterList.vue'),
    },
    {
      path: '/character/new',
      name: 'character-create',
      component: () => import('../views/CharacterCreate.vue'),
    },
  ],
})

export default router
