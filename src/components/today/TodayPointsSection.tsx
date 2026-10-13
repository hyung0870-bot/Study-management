import { useState, useMemo } from 'react';
import { Award, Check, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../../store/StoreContext';
import { useParentAuth } from '../../store/ParentAuth';
import { uid } from '../../lib/date';

interface TodayPointsSectionProps {
  dateKey: string;
  isToday: boolean;
  onRequestParentAuth: () => void;
}

export default function TodayPointsSection({
  dateKey,
  isToday,
  onRequestParentAuth,
}: TodayPointsSectionProps) {
  const { data, update, selectedChildId } = useStore();
  const { unlocked, activeMember } = useParentAuth();

  // 아코디언 열림/닫힘
  const [open, setOpen] = useState(true);

  // 부모 상벌점 부여 선택 상태
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');

  // 아이 보상 구매 선택 상태
  const [selectedRewardId, setSelectedRewardId] = useState<string>('');

  // 대상 아이
  const currentChildId =
    selectedChildId || (data.familyMembers ?? []).find((m) => m.role === 'child')?.id;
  const currentChild = (data.familyMembers ?? []).find((m) => m.id === currentChildId);

  // 상벌점 규칙 및 보상 목록
  const rules = data.pointRules ?? [];
  const rewards = data.rewardItems ?? [];

  // 로그 목록
  const allLogs = data.pointLogs ?? [];
  const childLogs = useMemo(() => {
    return allLogs.filter((l) => !l.childId || l.childId === currentChildId);
  }, [allLogs, currentChildId]);

  // 오늘 날짜의 로그
  const todayLogs = useMemo(() => {
    return childLogs
      .filter((l) => l.date === dateKey)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [childLogs, dateKey]);

  // 누적 총 보유 상점 (모든 날짜 누적)
  const totalBalance = useMemo(() => {
    return childLogs.reduce((acc, log) => acc + log.points, 0);
  }, [childLogs]);

  // 오늘 획득/차감 점수 합계
  const todayPointsSum = useMemo(() => {
    return todayLogs.reduce((acc, log) => acc + log.points, 0);
  }, [todayLogs]);

  // 오늘 상점 합계 (+만)
  const todayBonusSum = useMemo(() => {
    return todayLogs.filter((l) => l.type === 'bonus').reduce((acc, l) => acc + l.points, 0);
  }, [todayLogs]);

  // 오늘 벌점 합계 (-만, 절댓값)
  const todayPenaltySum = useMemo(() => {
    return todayLogs.filter((l) => l.type === 'penalty').reduce((acc, l) => acc + Math.abs(l.points), 0);
  }, [todayLogs]);

  // 부모가 항목을 드롭메뉴에서 선택 후 체크/부여하기
  const handleAwardRule = () => {
    if (!unlocked) {
      onRequestParentAuth();
      return;
    }
    const rule = rules.find((r) => r.id === selectedRuleId);
    if (!rule) return;

    const points = rule.type === 'bonus' ? Number(rule.points) : -Number(rule.points);
    const parentName = activeMember?.name || '부모님';

    update((prev) => {
      const newLog = {
        id: 'point-log-' + uid(),
        date: dateKey,
        timestamp: new Date().toISOString(),
        type: rule.type,
        title: rule.title,
        points,
        giverName: parentName,
        childId: currentChildId,
      };
      return {
        ...prev,
        pointLogs: [newLog, ...(prev.pointLogs ?? [])],
      };
    }, `${currentChild?.name || '아이'}에게 [${rule.title}] ${points > 0 ? `+${points}` : points}점을 부여했습니다. ⭐`);

    setSelectedRuleId('');
  };

  // 아이가 구매하고자 하는 항목을 드롭메뉴에서 선택해서 구매
  const handlePurchaseReward = () => {
    const reward = rewards.find((r) => r.id === selectedRewardId);
    if (!reward) return;

    if (totalBalance < reward.price) {
      alert(`상점이 부족해요! (필요: ${reward.price}점 / 현재 보유: ${totalBalance}점)`);
      return;
    }

    const confirmed = window.confirm(
      `[${reward.title}]을(를) 구매하시겠습니까?\n누적 상점에서 ${reward.price}점이 차감됩니다.`,
    );
    if (!confirmed) return;

    update((prev) => {
      const newLog = {
        id: 'point-log-' + uid(),
        date: dateKey,
        timestamp: new Date().toISOString(),
        type: 'reward_purchase' as const,
        title: reward.title,
        points: -Number(reward.price),
        giverName: '상점 교환',
        childId: currentChildId,
      };
      return {
        ...prev,
        pointLogs: [newLog, ...(prev.pointLogs ?? [])],
      };
    }, `🎉 [${reward.title}]을(를) 구매했습니다! (-${reward.price}점)`);

    setSelectedRewardId('');
  };

  // 오늘 부여/구매한 내역 취소(삭제) - 부모 모드만
  const handleDeleteLog = (logId: string) => {
    if (!unlocked) return;
    update((prev) => ({
      ...prev,
      pointLogs: (prev.pointLogs ?? []).filter((l) => l.id !== logId),
    }), '상점/벌점 기록을 취소했습니다.');
  };

  return (
    <div className="paper-card mb-4 overflow-hidden border border-amber-200/60 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30">
      {/* 헤더 */}
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex cursor-pointer items-center justify-between p-3.5 hover:bg-amber-100/30 transition select-none"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
            <Award size={17} />
          </span>
          <div>
            <span className="font-hand text-lg font-bold text-ink">
              {currentChild?.name || '아이'}의 상점 / 벌점
            </span>
            <span className="ml-2 text-xs text-ink-muted">
              (Today: <strong className={todayPointsSum >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {todayPointsSum > 0 ? `+${todayPointsSum}` : todayPointsSum}점
              </strong> / 누적: <strong className="text-amber-600">{totalBalance}점</strong>)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="text-ink-soft">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4">
          {/* 1. 요약 배너 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="rounded-xl bg-white p-2.5 border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] text-ink-muted block">Today 상점</span>
              <span className="font-bold text-emerald-600 text-sm">+{todayBonusSum}점</span>
            </div>
            <div className="rounded-xl bg-white p-2.5 border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] text-ink-muted block">Today 벌점</span>
              <span className="font-bold text-rose-600 text-sm">-{todayPenaltySum}점</span>
            </div>
            <div className="rounded-xl bg-white p-2.5 border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] text-ink-muted block">Today 합계</span>
              <span className={`font-bold text-sm ${todayPointsSum >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {todayPointsSum > 0 ? `+${todayPointsSum}` : todayPointsSum}점
              </span>
            </div>
            <div className="rounded-xl bg-amber-100/60 p-2.5 border border-amber-200 text-amber-900 shadow-2xs">
              <span className="text-[10px] text-amber-800 font-semibold block">누적 보유 상점</span>
              <span className="font-hand font-extrabold text-base text-amber-700">
                {totalBalance}점
              </span>
            </div>
          </div>

          {/* 2. 부모: 상점/벌점 항목 드롭메뉴 선택 & Check 부여 */}
          {unlocked ? (
            <div className="rounded-xl bg-amber-50/70 p-3 border border-amber-200/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                  <span>👨‍👩‍👧</span>
                  <span>부모 전용: 상점/벌점 부여하기</span>
                </span>
                <span className="text-[11px] text-amber-700">아이의 수행 이야기를 듣고 체크해주세요</span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <select
                  value={selectedRuleId}
                  onChange={(e) => setSelectedRuleId(e.target.value)}
                  className="flex-1 rounded-xl bg-white border border-amber-300 px-3 py-2 text-xs font-medium text-ink focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">항목을 선택하세요 (상점/벌점 목록)</option>
                  <optgroup label="✨ 상점 받을 항목 (+)">
                    {rules
                      .filter((r) => r.type === 'bonus')
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          [+{r.points}점] {r.title} ({r.category || '기본'})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="⚠️ 벌점 받을 항목 (-)">
                    {rules
                      .filter((r) => r.type === 'penalty')
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          [-{r.points}점] {r.title} ({r.category || '기본'})
                        </option>
                      ))}
                  </optgroup>
                </select>

                <button
                  type="button"
                  disabled={!selectedRuleId}
                  onClick={handleAwardRule}
                  className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs ${
                    selectedRuleId
                      ? 'bg-amber-600 text-white hover:bg-amber-700 active:scale-95'
                      : 'bg-slate-200 text-ink-muted cursor-not-allowed'
                  }`}
                >
                  <Check size={14} strokeWidth={3} />
                  <span>체크 및 부여</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200/60 text-xs text-ink-soft">
              <span>💡 상점/벌점 부여는 <strong>부모 모드</strong>에서 할 수 있어요.</span>
              <button
                type="button"
                onClick={onRequestParentAuth}
                className="font-bold text-amber-600 hover:underline shrink-0 ml-2"
              >
                부모 모드로 전환 →
              </button>
            </div>
          )}

          {/* 3. 아이: 누적 상점으로 보상 구매하기 드롭다운 */}
          <div className="rounded-xl bg-purple-50/60 p-3 border border-purple-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-purple-900 flex items-center gap-1">
                <span>🎁</span>
                <span>누적 상점으로 보상 구매하기</span>
              </span>
              <span className="text-[11px] text-purple-700">현재 보유: {totalBalance}점</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={selectedRewardId}
                onChange={(e) => setSelectedRewardId(e.target.value)}
                className="flex-1 rounded-xl bg-white border border-purple-300 px-3 py-2 text-xs font-medium text-ink focus:outline-hidden focus:ring-1 focus:ring-purple-500"
              >
                <option value="">원하는 보상을 선택하세요</option>
                {rewards.map((rew) => {
                  const affordable = totalBalance >= rew.price;
                  return (
                    <option key={rew.id} value={rew.id} disabled={!affordable}>
                      [{rew.price}점] {rew.title} {affordable ? '(구매가능)' : `(${rew.price - totalBalance}점 부족)`}
                    </option>
                  );
                })}
              </select>

              <button
                type="button"
                disabled={!selectedRewardId}
                onClick={handlePurchaseReward}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition shadow-xs ${
                  selectedRewardId
                    ? 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
                    : 'bg-slate-200 text-ink-muted cursor-not-allowed'
                }`}
              >
                <ShoppingBag size={14} />
                <span>선택 항목 구매</span>
              </button>
            </div>
          </div>

          {/* 4. 오늘의 상점/벌점 & 구매 내역 목록 */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-ink">
                오늘 부여 및 사용 내역 ({todayLogs.length}건)
              </span>
              <span className="text-[11px] text-ink-muted">
                {isToday ? '오늘' : dateKey} 기준
              </span>
            </div>

            {todayLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-center text-xs text-ink-soft">
                오늘 부여되거나 구매한 내역이 아직 없습니다.
              </div>
            ) : (
              <div className="space-y-1.5">
                {todayLogs.map((log) => {
                  const isBonus = log.type === 'bonus';
                  const isPenalty = log.type === 'penalty';

                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-slate-100 shadow-2xs text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
                            isBonus
                              ? 'bg-emerald-100 text-emerald-700'
                              : isPenalty
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {isBonus ? '+' : isPenalty ? '-' : '🎁'}
                        </span>
                        <div className="min-w-0 truncate">
                          <span className="font-bold text-ink mr-1.5">{log.title}</span>
                          <span className="text-[10px] text-ink-muted">
                            ({new Date(log.timestamp).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {log.giverName && ` · ${log.giverName}`})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-hand text-base font-extrabold ${
                            isBonus
                              ? 'text-emerald-600'
                              : isPenalty
                              ? 'text-rose-600'
                              : 'text-purple-600'
                          }`}
                        >
                          {log.points > 0 ? `+${log.points}` : log.points}점
                        </span>

                        {unlocked && (
                          <button
                            type="button"
                            onClick={() => handleDeleteLog(log.id)}
                            className="text-[10px] text-rose-500 hover:underline px-1"
                            title="부여 취소"
                          >
                            취소
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
