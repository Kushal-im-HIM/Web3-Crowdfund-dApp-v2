import { useState } from "react";
import { ethers } from "ethers";
import { useContract } from "../../hooks/useContract";

const EMPTY_MS = { title: "", description: "", targetEth: "", durationDays: "" };

export default function MilestoneCreationForm({ campaignId, onDone }) {
  const { useRegisterCampaignForMilestones, useCreateMilestone } = useContract();
  const { write: register, isLoading: registering } = useRegisterCampaignForMilestones();
  const { write: createMs } = useCreateMilestone();

  const [milestones, setMilestones] = useState([{ ...EMPTY_MS }]);
  const [isRegistered, setIsRegistered] = useState(false);

  const handleAddMs = () => setMilestones([...milestones, { ...EMPTY_MS }]);
  const handleUpdate = (i, f, v) => {
    const newMs = [...milestones];
    newMs[i][f] = v;
    setMilestones(newMs);
  };

  const handleSaveAll = async () => {
    for (const m of milestones) {
      if (!m.title || !m.targetEth) continue;
      createMs({
        args: [
          campaignId,
          m.title,
          m.description,
          ethers.utils.parseEther(m.targetEth),
          BigInt(m.durationDays) * 86400n
        ]
      });
    }
    if (onDone) onDone();
  };

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mt-8">
      <h3 className="text-lg font-bold text-indigo-900 mb-2">Milestone Configuration</h3>
      <p className="text-sm text-indigo-700 mb-6">Define clear goals for your project to build trust with your backers.</p>

      {!isRegistered ? (
        <button
          onClick={() => { register({ args: [campaignId] }); setIsRegistered(true); }}
          className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition"
        >
          Enable Milestones for this Project
        </button>
      ) : (
        <div className="space-y-4">
          {milestones.map((m, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <input
                className="w-full mb-2 p-2 border-b outline-none font-semibold"
                placeholder="Milestone Title"
                value={m.title}
                onChange={(e) => handleUpdate(i, "title", e.target.value)}
              />
              <div className="flex gap-4">
                <input
                  type="number"
                  className="w-1/2 p-2 bg-gray-50 rounded"
                  placeholder="Target ETH"
                  value={m.targetEth}
                  onChange={(e) => handleUpdate(i, "targetEth", e.target.value)}
                />
                <input
                  type="number"
                  className="w-1/2 p-2 bg-gray-50 rounded"
                  placeholder="Days"
                  value={m.durationDays}
                  onChange={(e) => handleUpdate(i, "durationDays", e.target.value)}
                />
              </div>
            </div>
          ))}
          <div className="flex gap-4 pt-4">
            <button onClick={handleAddMs} className="flex-1 border-2 border-indigo-600 text-indigo-600 font-bold py-2 rounded-lg">+ Add Another</button>
            <button onClick={handleSaveAll} className="flex-1 bg-green-600 text-white font-bold py-2 rounded-lg">Save All Milestones</button>
          </div>
        </div>
      )}
    </div>
  );
}