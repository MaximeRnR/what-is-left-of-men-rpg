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
    {
      path: '/character/:id',
      name: 'character-sheet',
      component: () => import('../views/CharacterSheet.vue'),
      props: true,
    },
    {
      path: '/character/:id/edit',
      name: 'character-edit',
      component: () => import('../views/CharacterEdit.vue'),
      props: true,
    },
  ],
})

export default router
