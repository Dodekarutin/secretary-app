# IndexedDBの確認方法

## ブラウザのDevToolsで確認

1. **Chrome/Edge:**
   - F12でDevToolsを開く
   - 「Application」タブをクリック
   - 左側のメニューから「Storage」→「IndexedDB」→「secretary-app」を展開
   - 「tasks」を選択すると、保存されているタスク一覧が表示されます

2. **Firefox:**
   - F12でDevToolsを開く
   - 「Storage」タブをクリック
   - 左側のメニューから「IndexedDB」→「secretary-app」→「tasks」を選択

## コンソールで確認

ブラウザのコンソールで以下を実行：

```javascript
// IndexedDBを開く
const request = indexedDB.open('secretary-app', 1);

request.onsuccess = (event) => {
  const db = event.target.result;
  const tx = db.transaction('tasks', 'readonly');
  const store = tx.objectStore('tasks');
  const getAllRequest = store.getAll();
  
  getAllRequest.onsuccess = () => {
    console.log('All tasks:', getAllRequest.result);
    console.log('Total tasks:', getAllRequest.result.length);
  };
};
```

## 期待される動作

- **タスク追加時**: `addTask`または`addSubtask`が呼ばれ、IndexedDBに即座に保存される
- **子タスク追加**: `parentId`フィールドに親タスクのIDが設定される
- **兄弟タスク追加**: 親がいる場合は同じ`parentId`、いない場合は`parentId`がundefined/null

