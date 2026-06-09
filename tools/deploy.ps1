# GitHub Pages デプロイスクリプト（gh CLI不要版）
# Windows資格情報マネージャーの git:https://github.com からトークンを取得してGitHub APIを直接呼ぶ。
# トークンは一切表示しない。
# usage:  powershell -File tools\deploy.ps1          # 認証チェックのみ
#         powershell -File tools\deploy.ps1 -Deploy  # リポジトリ作成→push→Pages有効化
param([switch]$Deploy)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$REPO_NAME = "dot-damashii"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class CredMan {
  [DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredRead(string target, uint type, uint flags, out IntPtr credentialPtr);
  [DllImport("advapi32.dll")]
  public static extern void CredFree(IntPtr cred);
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct CREDENTIAL {
    public uint Flags; public uint Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public uint CredentialBlobSize; public IntPtr CredentialBlob; public uint Persist;
    public uint AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
  }
}
"@

function Get-GitHubToken {
  $ptr = [IntPtr]::Zero
  if (-not [CredMan]::CredRead("git:https://github.com", 1, 0, [ref]$ptr)) {
    throw "資格情報マネージャーから git:https://github.com を読み取れませんでした"
  }
  $cred = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][CredMan+CREDENTIAL])
  $bytes = New-Object byte[] $cred.CredentialBlobSize
  [System.Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
  [CredMan]::CredFree($ptr)
  $raw = [System.Text.Encoding]::UTF8.GetString($bytes)
  if ($raw.Contains([char]0)) { $raw = [System.Text.Encoding]::Unicode.GetString($bytes) }
  return $raw.Trim([char]0, ' ').Trim()
}

$token = Get-GitHubToken
$headers = @{
  Authorization = "token $token"
  "User-Agent"  = "dot-damashii-deploy"
  Accept        = "application/vnd.github+json"
}

# --- 認証チェック ---
$resp = Invoke-WebRequest -Uri "https://api.github.com/user" -Headers $headers -UseBasicParsing
$me = $resp.Content | ConvertFrom-Json
Write-Output ("LOGIN: " + $me.login)
Write-Output ("SCOPES: " + $resp.Headers["X-OAuth-Scopes"])

if (-not $Deploy) {
  Write-Output "チェックのみ完了（デプロイは -Deploy を付けて実行）"
  exit 0
}

$owner = $me.login

# --- 1. リポジトリ作成（既存なら続行）---
$created = $false
try {
  $body = @{ name = $REPO_NAME; description = "ドット魂 〜昭和激闘伝〜 昭和レトロ風ドット絵対戦格闘ゲーム（オンライン対戦対応）"; private = $false } | ConvertTo-Json
  Invoke-RestMethod -Method POST -Uri "https://api.github.com/user/repos" -Headers $headers -Body $body -ContentType "application/json" | Out-Null
  $created = $true
  Write-Output "REPO: 作成しました"
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  if ($code -eq 422) { Write-Output "REPO: 既に存在します（続行）" }
  else { throw }
}

# --- 2. push ---
$remoteUrl = "https://github.com/$owner/$REPO_NAME.git"
$existing = git remote 2>$null
if ($existing -contains "origin") { git remote set-url origin $remoteUrl } else { git remote add origin $remoteUrl }
git push -u origin main
if (-not $?) { throw "git push に失敗しました" }
Write-Output "PUSH: 完了"

# --- 3. Pages有効化（既存なら続行）---
try {
  $pagesBody = @{ source = @{ branch = "main"; path = "/" } } | ConvertTo-Json -Depth 3
  Invoke-RestMethod -Method POST -Uri "https://api.github.com/repos/$owner/$REPO_NAME/pages" -Headers $headers -Body $pagesBody -ContentType "application/json" | Out-Null
  Write-Output "PAGES: 有効化しました"
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  if ($code -eq 409) { Write-Output "PAGES: 既に有効です（続行）" }
  else { throw }
}

# --- 4. 公開URL確認（最大4分ポーリング）---
$url = "https://$owner.github.io/$REPO_NAME/"
Write-Output "URL: $url"
for ($i = 0; $i -lt 8; $i++) {
  Start-Sleep -Seconds 30
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15
    if ($r.StatusCode -eq 200) { Write-Output "STATUS: 公開確認OK (HTTP 200)"; exit 0 }
  } catch {
    Write-Output ("STATUS: まだ反映されていません… (" + ($i + 1) + "/8)")
  }
}
Write-Output "STATUS: タイムアウト。数分後に再度URLを確認してください（Pagesの初回ビルドは時間がかかることがあります）"
exit 0
