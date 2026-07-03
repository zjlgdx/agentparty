// 频道访问控制（spec §3.2 矩阵）——纯函数，便于单测
import type { TokenIdentity } from "./auth";

// canAccessChannel / isChannelModerator 只依赖身份的这三个字段
export type AclIdentity = Pick<TokenIdentity, "hash" | "name" | "role" | "email">;

export interface ChannelAcl {
  visibility: string;
  created_by: string | null;
}

// OIDC 人类身份的 hash 形如 "oidc:<sub>"（见 auth.ts verifyOidcToken）；
// ap_ token 的 hash 是 sha256 hex，绝不以此前缀开头。
function isOidcIdentity(identity: AclIdentity): boolean {
  return identity.hash.startsWith("oidc:");
}

// OIDC 人类是否为频道房主：email 或 name（即 sub）命中 created_by。
// created_by 为 null（历史频道）时 undefined/null 都不会误命中。
function isOidcOwner(identity: AclIdentity, channel: ChannelAcl): boolean {
  return identity.email === channel.created_by || identity.name === channel.created_by;
}

// 是否允许「进入/读」该频道（spec §3.2 entry matrix）：
// - public：任何通过鉴权的身份放行
// - private：ap_ token（agent/human/readonly，都是 leo 铸的）恒放行；OIDC 人类仅房主放行
// 写权限在此之上再叠加现有规则（readonly 不能发），不在本函数内判断。
export function canAccessChannel(identity: AclIdentity, channel: ChannelAcl): boolean {
  if (channel.visibility === "public") return true;
  if (!isOidcIdentity(identity)) return true;
  return isOidcOwner(identity, channel);
}

// 是否可对频道做管理操作（踢人，spec §5 防滥用）：
// 非只读的 ap_ token（leo 铸的 agent/human），或 OIDC 房主本人。
export function isChannelModerator(identity: AclIdentity, channel: ChannelAcl): boolean {
  if (identity.role === "readonly") return false;
  if (!isOidcIdentity(identity)) return true;
  return isOidcOwner(identity, channel);
}
