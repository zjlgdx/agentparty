-- 公开/私有频道（spec §3.2 访问矩阵）：默认 private = 零破坏，现有频道全部私有。
-- public 频道任何登录身份可进可发；private 仅 ap_ token 或 OIDC 房主可进。
ALTER TABLE channels ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private';
