/**
 * components/Campaign/CampaignComments.js
 *
 * Community discussion thread for campaigns.
 * Uses localStorage for persistence — no backend required.
 * Comments are keyed by campaignId so each campaign has its own thread.
 *
 * Features:
 *   - Post comments (wallet-addressed or anonymous)
 *   - Reply to comments (1 level deep)
 *   - Like/upvote comments
 *   - Timestamps
 *   - Wallet address shown as author if connected
 */

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { FiMessageCircle, FiThumbsUp, FiCornerDownRight, FiSend, FiUser } from "react-icons/fi";

const STORAGE_KEY = (id) => `ethosfund_comments_${id}`;

// Seed comments that appear for all campaigns on first load
const SEED_COMMENTS = [
  {
    id: "seed_1",
    author: "0x4a2b...7f3e",
    text: "Really impressed by the milestone structure here. The community approval mechanism is exactly what crypto crowdfunding needs — no more rugs.",
    timestamp: Date.now() - 1000 * 60 * 60 * 3,
    likes: 14,
    likedBy: [],
    replies: [
      {
        id: "seed_1r1",
        author: "0x9c3d...1a4f",
        text: "Agreed. The fact that funds can't be withdrawn without a vote is a massive trust signal.",
        timestamp: Date.now() - 1000 * 60 * 60 * 2,
        likes: 6,
        likedBy: [],
      }
    ]
  },
  {
    id: "seed_2",
    author: "0x71fe...c820",
    text: "Will there be an update about the timeline? Milestone 2 seems ambitious for 3 weeks.",
    timestamp: Date.now() - 1000 * 60 * 30,
    likes: 3,
    likedBy: [],
    replies: []
  }
];

function formatTime(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Avatar({ address }) {
  const colors = ["from-emerald-500 to-cyan-500","from-purple-500 to-pink-500","from-amber-500 to-orange-500","from-blue-500 to-indigo-500"];
  const idx = address ? parseInt(address.slice(-1), 16) % colors.length : 0;
  const initials = address ? address.slice(2, 4).toUpperCase() : "?";
  return (
    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colors[idx]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

function CommentItem({ comment, currentAddress, onLike, onReply }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const liked = currentAddress && comment.likedBy.includes(currentAddress);

  const submitReply = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText.trim());
    setReplyText("");
    setShowReply(false);
  };

  return (
    <div className="group">
      <div className="flex gap-3">
        <Avatar address={comment.author} />
        <div className="flex-1 min-w-0">
          <div className="bg-white dark:bg-primary-800 rounded-xl rounded-tl-none border border-emerald-100 dark:border-primary-700 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold font-mono text-emerald-700 dark:text-emerald-400">
                {comment.author}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">{formatTime(comment.timestamp)}</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-gray-300 leading-relaxed">{comment.text}</p>
          </div>

          <div className="flex items-center gap-3 mt-1.5 px-1">
            <button
              onClick={() => onLike(comment.id)}
              className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                liked ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500 hover:text-emerald-600"
              }`}
            >
              <FiThumbsUp className="w-3.5 h-3.5" />
              {comment.likes > 0 && comment.likes}
            </button>
            <button
              onClick={() => setShowReply(!showReply)}
              className="flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              <FiCornerDownRight className="w-3.5 h-3.5" />
              Reply
            </button>
          </div>

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2 ml-3 border-l-2 border-emerald-100 dark:border-primary-700 pl-3 space-y-2">
              {comment.replies.map(reply => (
                <div key={reply.id} className="flex gap-2">
                  <Avatar address={reply.author} />
                  <div className="flex-1">
                    <div className="bg-emerald-50 dark:bg-primary-900/50 rounded-xl rounded-tl-none border border-emerald-100 dark:border-primary-700 px-3 py-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold font-mono text-emerald-700 dark:text-emerald-400">{reply.author}</span>
                        <span className="text-xs text-slate-400">{formatTime(reply.timestamp)}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-gray-300">{reply.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply input */}
          {showReply && (
            <div className="mt-2 ml-3 flex gap-2">
              <Avatar address={currentAddress || "anon"} />
              <div className="flex-1 flex gap-2">
                <input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && submitReply()}
                  placeholder="Write a reply..."
                  className="flex-1 text-sm px-3 py-2 bg-white dark:bg-primary-800 border border-emerald-200 dark:border-primary-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-slate-900 dark:text-white placeholder-slate-400"
                />
                <button
                  onClick={submitReply}
                  disabled={!replyText.trim()}
                  className="p-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg transition-colors"
                >
                  <FiSend className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CampaignComments({ campaignId }) {
  const { address, isConnected } = useAccount();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY(campaignId));
      if (stored) {
        setComments(JSON.parse(stored));
      } else {
        // First visit — seed with community comments
        setComments(SEED_COMMENTS);
        localStorage.setItem(STORAGE_KEY(campaignId), JSON.stringify(SEED_COMMENTS));
      }
    } catch {
      setComments(SEED_COMMENTS);
    }
    setIsLoaded(true);
  }, [campaignId]);

  const save = useCallback((updated) => {
    setComments(updated);
    try { localStorage.setItem(STORAGE_KEY(campaignId), JSON.stringify(updated)); } catch {}
  }, [campaignId]);

  const postComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: `c_${Date.now()}`,
      author: isConnected && address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Anonymous",
      text: newComment.trim(),
      timestamp: Date.now(),
      likes: 0,
      likedBy: [],
      replies: [],
    };
    save([comment, ...comments]);
    setNewComment("");
  };

  const likeComment = (commentId) => {
    const key = address || "anon";
    save(comments.map(c => {
      if (c.id !== commentId) return c;
      const alreadyLiked = c.likedBy.includes(key);
      return {
        ...c,
        likes: alreadyLiked ? c.likes - 1 : c.likes + 1,
        likedBy: alreadyLiked ? c.likedBy.filter(x => x !== key) : [...c.likedBy, key],
      };
    }));
  };

  const addReply = (commentId, text) => {
    save(comments.map(c => {
      if (c.id !== commentId) return c;
      const reply = {
        id: `r_${Date.now()}`,
        author: isConnected && address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Anonymous",
        text,
        timestamp: Date.now(),
        likes: 0,
        likedBy: [],
      };
      return { ...c, replies: [...(c.replies || []), reply] };
    }));
  };

  if (!isLoaded) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FiMessageCircle className="w-5 h-5 text-emerald-500" />
        <h3 className="font-display font-bold text-slate-900 dark:text-white">
          Community Discussion
        </h3>
        <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
          {comments.length}
        </span>
      </div>

      {/* Post new comment */}
      <div className="flex gap-3">
        <Avatar address={address || "anon"} />
        <div className="flex-1">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), postComment())}
            placeholder={isConnected ? "Share your thoughts on this campaign..." : "Connect wallet to comment..."}
            rows={2}
            className="w-full px-4 py-3 text-sm bg-white dark:bg-primary-800 border border-emerald-200 dark:border-primary-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {isConnected ? `Posting as ${address?.slice(0,6)}...${address?.slice(-4)}` : "Anonymous posting enabled"}
            </span>
            <button
              onClick={postComment}
              disabled={!newComment.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-emerald text-white text-sm font-semibold rounded-lg hover:shadow-emerald-glow disabled:opacity-40 transition-all"
            >
              <FiSend className="w-3.5 h-3.5" />
              Post
            </button>
          </div>
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-primary-800 rounded-xl border border-emerald-100 dark:border-primary-700">
            <FiMessageCircle className="w-10 h-10 text-emerald-200 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">Be the first to comment on this campaign.</p>
          </div>
        ) : (
          comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentAddress={address}
              onLike={likeComment}
              onReply={addReply}
            />
          ))
        )}
      </div>
    </div>
  );
}
