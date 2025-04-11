// monitor.js
const axios = require('axios');
const cron = require('node-cron');

require('dotenv').config();

// jsonbin
const binHeaders = {
  'X-Master-Key': process.env.X_MASTER_KEY,
  'Content-Type': 'application/json'
}

// discord webhook
const discordWebhookUrl = process.env.DISCORD_WEBHOOK;

// 최신 sha 조회
async function getLastSha(repo) {
  const res = await axios.get(`https://api.jsonbin.io/v3/b/${repo === "fe" ? process.env.BIN_ID_FE : process.env.BIN_ID_BE}`, { 
      headers: binHeaders
    }
  )
  
  return res.data.record.sha;
}

// 최신 sha 덮어쓰기 
async function saveSha(repo, branch, sha) {
  await axios.put(`https://api.jsonbin.io/v3/b/${repo === "fe" ? process.env.BIN_ID_FE : process.env.BIN_ID_BE}`, 
    { repo, branch, sha }, { headers: binHeaders })
}

// 최신 커밋 여부 체크
async function checkCommit(repo) {

  const prevSha = await getLastSha(repo) // jsonbin에 저장된 최근 sha

  const commitsRes = await axios.get(`https://api.github.com/repos/${repo === "fe" ? process.env.FE_REPO : process.env.BE_REPO}/commits?sha=${repo === "fe" ? process.env.FE_BRANCH : process.env.BE_BRANCH}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        'User-Agent': 'miznunim' 
      }
    }
  );

  const curCommitData = commitsRes.data[0]
  const { sha, commit } = curCommitData

  if (prevSha !== sha) {
    await axios.post(discordWebhookUrl, {
      content: `👻📦 새 커밋! "${commit.message}" - ${curCommitData.html_url}`,
      headers: {
        Authorization: process.env.GITHUB_TOKEN,
        'User-Agent': 'miznunim'
      }
    });

    const branch = repo === 'fe' ? process.env.FE_BRANCH : process.env.BE_BRANCH
    await saveSha(repo, branch, sha)
  }
}

/*(async () => {
  try {
    await checkCommit('be');
    await checkCommit('fe');
  } catch (err) {
    console.error('Error occurred:', err);
  }
})();*/

cron.schedule('*/5 * * * *', async () => await checkCommit("be")); 
cron.schedule('*/5 * * * *', async() => await checkCommit("fe"));
